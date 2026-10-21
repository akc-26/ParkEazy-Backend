import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { User, VehicleCompatibility } from './types';

export const apiRouter = Router();

// Middleware to resolve current user from authorization header or session header
export async function getAuthenticatedUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  const customUserId = req.headers['x-user-id'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const user = await db.validateSession(token);
      if (user) return user;
    }
  }

  if (customUserId) {
    const user = await db.validateSession(customUserId);
    if (user) return user;
  }

  // Strict: Unauthenticated requests return null
  return null;
}

// Auth Middleware guard for any authenticated user
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Auth guard specifically for Host accounts
async function requireHost(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Host authentication required. Please sign in to the Host Portal.' });
    }
    if (user.role !== 'host' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Host account privileges required.' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Auth guard specifically for Administrator accounts
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Administrator authentication required. Please sign in to Admin Moderation.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// ----------------- AUTH ROUTES -----------------
apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await db.findUserByEmail(email);
  if (!user || !(await db.verifyPassword(user, password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status === 'suspended' || user.status === 'closed') {
    return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
  }

  // Generate cryptographically secure session
  const session = await db.createSession(user);

  return res.json({
    token: session.token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      businessDetails: user.businessDetails
    }
  });
});

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, role, businessDetails } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    // Server-side enforcement: Public registration must never create an administrator
    const requestedRole = String(role).toLowerCase().trim();
    if (requestedRole === 'admin' || requestedRole === 'superadmin' || requestedRole === 'super_admin') {
      return res.status(403).json({
        error: 'Public registration cannot create administrative or privileged accounts. Privileged roles must be provisioned through an authorized administrative mechanism.'
      });
    }

    if (requestedRole !== 'customer' && requestedRole !== 'host') {
      return res.status(400).json({ error: 'Invalid registration role. Permitted roles are "customer" and "host".' });
    }

    const newUser = await db.createUser({
      email,
      password,
      fullName,
      phone,
      role: requestedRole as 'customer' | 'host',
      businessDetails
    });

    const session = await db.createSession(newUser);

    const { passwordHash: _hash, ...safeUser } = newUser;
    return res.status(201).json({
      token: session.token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { passwordHash: _hash, ...safeUser } = user;
  return res.json({ user: safeUser });
});

apiRouter.put('/auth/profile', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const updated = await db.updateUserProfile(user.id, req.body);
    const { passwordHash: _hash, ...safeUser } = updated;
    return res.json({ user: safeUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const customUserId = req.headers['x-user-id'] as string;
  let token = customUserId;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (token) {
    await db.revokeSession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const result = await db.requestPasswordReset(email);
    return res.json(result);
  } catch (err: any) {
    return res.status(429).json({ error: err.message });
  }
});

apiRouter.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }
    const result = await db.resetPasswordWithToken(token, newPassword);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Demo switch route to easily switch test accounts in preview
apiRouter.get('/auth/demo-users', async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.ENABLE_DEMO_AUTH !== 'false';
  if (isProduction || !allowDemo) {
    return res.status(403).json({ error: 'Demo accounts discovery is disabled in production.' });
  }

  const users = (await Promise.all([
    db.findUserById('usr_host1'),
    db.findUserById('usr_host2'),
    db.findUserById('usr_cust1'),
    db.findUserById('usr_admin1')
  ])).filter(Boolean).map(u => {
    const { passwordHash: _hash, ...safe } = u!;
    return safe;
  });
  return res.json(users);
});

// ----------------- FACILITIES -----------------
apiRouter.get('/facilities', async (req, res) => {
  const { hostId, status, city } = req.query;
  const user = await getAuthenticatedUser(req);
  let effectiveHostId = hostId as string;

  // Enforce host ownership isolation: A host cannot view another host's facilities by swapping hostId
  if (user && user.role === 'host') {
    if (effectiveHostId && effectiveHostId !== user.id) {
      return res.status(403).json({ error: 'Access denied: You cannot view another host\'s facilities.' });
    }
  }

  const facilities = await db.getFacilities({
    hostId: effectiveHostId,
    status: status as string,
    city: city as string
  });
  return res.json(facilities);
});

apiRouter.get('/facilities/:id', async (req, res) => {
  const facility = await db.getFacilityById(req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  const bays = await db.getBaysByFacility(facility.id);
  const pricingRules = await db.getPricingRules(facility.id);
  const reviews = await db.getReviews(facility.id);
  return res.json({ ...facility, bays, pricingRules, reviews });
});

apiRouter.post('/facilities', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const facility = await db.createFacility(user.id, req.body);
    return res.status(201).json(facility);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/facilities/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getFacilityById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Facility not found' });
    if (existing.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }
    const facility = await db.updateFacility(req.params.id, req.body, user);
    return res.json(facility);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/facilities/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getFacilityById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Facility not found' });
    if (existing.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }
    const success = await db.deleteFacility(req.params.id, user);
    return res.json({ success });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/facilities/:id/submit', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getFacilityById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Facility not found' });
    if (existing.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }
    const facility = await db.submitFacilityForReview(req.params.id, user);
    return res.json(facility);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/facilities/:id/toggle-status', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const facility = await db.getFacilityById(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (facility.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }

    const nextStatus = facility.status === 'active' ? 'suspended' : 'active';
    const updated = await db.updateFacility(facility.id, { status: nextStatus }, user);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- PARKING BAYS -----------------
apiRouter.get('/facilities/:id/bays', async (req, res) => {
  const bays = await db.getBaysByFacility(req.params.id);
  return res.json(bays);
});

apiRouter.post('/facilities/:id/bays', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const bay = await db.createBay(req.params.id, req.body, user);
    return res.status(201).json(bay);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/facilities/:id/bays/bulk', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { prefix, startIndex, count, zone, vehicleCompatibility, dimensions, isAccessibleADA, hasEvCharger, evPowerKw, hourlyRateMultiplier } = req.body;

    if (!prefix || !count || count <= 0) {
      return res.status(400).json({ error: 'Prefix and positive count are required' });
    }

    const created = await db.createBulkBays(
      req.params.id,
      {
        prefix,
        startIndex: startIndex || 1,
        count: Math.min(count, 50), // safety limit
        zone: zone || 'General',
        vehicleCompatibility: vehicleCompatibility || ['sedan', 'suv'],
        dimensions: dimensions || { lengthMeters: 5.0, widthMeters: 2.5, heightMeters: 2.2 },
        isAccessibleADA: !!isAccessibleADA,
        hasEvCharger: !!hasEvCharger,
        evPowerKw,
        hourlyRateMultiplier
      },
      user
    );

    return res.status(201).json({ count: created.length, bays: created });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/bays/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const bay = await db.updateBay(req.params.id, req.body, user);
    return res.json(bay);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/bays/:id/status', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const bay = await db.setBayStatus(req.params.id, status, reason, user);
    return res.json(bay);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/bays/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const success = await db.deleteBay(req.params.id, user);
    return res.json({ success });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- PRICING & QUOTES -----------------
apiRouter.get('/facilities/:id/pricing-rules', async (req, res) => {
  const rules = await db.getPricingRules(req.params.id);
  return res.json(rules);
});

apiRouter.post('/facilities/:id/pricing-rules', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const rule = await db.createPricingRule(req.params.id, req.body, user);
    return res.status(201).json(rule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/pricing-rules/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const rule = await db.updatePricingRule(req.params.id, req.body, user);
    return res.json(rule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/pricing-rules/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const rule = await db.getPricingRuleById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Pricing rule not found' });
    const facility = await db.getFacilityById(rule.facilityId);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (facility.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }
    const success = await db.deletePricingRule(req.params.id, user);
    return res.json({ success });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/pricing/estimate', async (req, res) => {
  try {
    const { facilityId, startTime, endTime, bayMultiplier } = req.body;
    if (!facilityId || !startTime || !endTime) {
      return res.status(400).json({ error: 'facilityId, startTime, and endTime are required' });
    }
    const estimate = await db.calculateQuote(facilityId, startTime, endTime, bayMultiplier || 1.0);
    return res.json(estimate);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- AVAILABILITY HOLDS -----------------
apiRouter.post('/holds', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user ? user.id : (req.body.customerId || 'usr_cust1');
    const { bayId, facilityId, startTime, endTime } = req.body;
    if (!bayId || !facilityId || !startTime || !endTime) {
      return res.status(400).json({ error: 'bayId, facilityId, startTime, and endTime are required' });
    }
    const hold = await db.createHold(bayId, facilityId, userId, startTime, endTime);
    return res.status(201).json(hold);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/holds/:id', async (req, res) => {
  await db.releaseHold(req.params.id);
  return res.json({ success: true });
});

// ----------------- BOOKINGS -----------------
apiRouter.get('/bookings', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const { hostId, customerId, facilityId, status } = req.query;

  let filters: any = {};
  if (user) {
    if (user.role === 'host') {
      filters.hostId = user.id;
    } else if (user.role === 'customer') {
      filters.customerId = user.id;
    } else if (user.role === 'admin') {
      if (hostId) filters.hostId = hostId as string;
      if (customerId) filters.customerId = customerId as string;
    }
  } else {
    // Public customer view: query specific customer or default demo customer
    if (customerId) {
      filters.customerId = customerId as string;
    } else {
      filters.customerId = 'usr_cust1';
    }
  }

  if (facilityId) filters.facilityId = facilityId as string;
  if (status) filters.status = status as string;

  const bookings = await db.getBookings(filters);
  return res.json(bookings);
});

apiRouter.get('/bookings/:id', async (req, res) => {
  const booking = await db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const facility = await db.getFacilityById(booking.facilityId);
  const bay = await db.getBayById(booking.bayId);
  const user = await getAuthenticatedUser(req);
  if (user) {
    if (user.role === 'host') {
      if (facility && facility.hostId !== user.id) {
        return res.status(403).json({ error: 'You do not have access to view this booking.' });
      }
    } else if (user.role === 'customer') {
      if (booking.customerId !== user.id) {
        return res.status(403).json({ error: 'You do not have access to view this booking.' });
      }
    }
  }
  return res.json({ ...booking, facility, bay });
});

apiRouter.post('/bookings', async (req, res) => {
  try {
    let user = await getAuthenticatedUser(req);
    const {
      facilityId,
      bayId,
      licensePlate,
      vehicleMakeModel,
      startTime,
      endTime,
      idempotencyKey,
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    if (!facilityId || !bayId || !licensePlate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }

    if (!user) {
      const email = (customerEmail || 'alex.driver@example.com').toLowerCase();
      user = (await db.findUserByEmail(email)) || (await db.createUser({
        email,
        password: 'driver_' + Math.random().toString(36).substring(7),
        fullName: customerName || 'Alex Driver',
        phone: customerPhone || '+1 (206) 555-0188',
        role: 'customer'
      }));
    }

    const booking = await db.createBooking({
      facilityId,
      bayId,
      customerId: user.id,
      customerName: user.fullName,
      customerPhone: user.phone || '+1 555-0100',
      customerEmail: user.email,
      licensePlate,
      vehicleMakeModel: vehicleMakeModel || 'Standard Vehicle',
      startTime,
      endTime,
      idempotencyKey
    });

    return res.status(201).json(booking);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Check-in (Gate Barrier Open Simulation)
apiRouter.post('/bookings/:id/check-in', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getBookingById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    const facility = await db.getFacilityById(existing.facilityId);
    if (existing.customerId !== user.id && facility?.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to check in this booking.' });
    }
    const booking = await db.checkInBooking(req.params.id, user);
    return res.json({
      success: true,
      message: 'Barrier gate opened. Check-in confirmed.',
      booking
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Check-out
apiRouter.post('/bookings/:id/check-out', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getBookingById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    const facility = await db.getFacilityById(existing.facilityId);
    if (existing.customerId !== user.id && facility?.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to check out this booking.' });
    }
    const booking = await db.checkOutBooking(req.params.id, user);
    return res.json({
      success: true,
      message: 'Gate opened. Check-out complete. Thank you for parking with ParkEazy!',
      booking
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Extend
apiRouter.post('/bookings/:id/extend', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getBookingById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    const facility = await db.getFacilityById(existing.facilityId);
    if (existing.customerId !== user.id && facility?.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to extend this booking.' });
    }
    const { hours } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ error: 'Valid hours required' });
    const booking = await db.extendBooking(req.params.id, Number(hours), user);
    return res.json(booking);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Cancel
apiRouter.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = await db.getBookingById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    const facility = await db.getFacilityById(existing.facilityId);
    if (existing.customerId !== user.id && facility?.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking.' });
    }
    const { reason } = req.body;
    const booking = await db.cancelBooking(req.params.id, reason || 'Customer requested cancellation', user);
    return res.json(booking);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- FINANCIALS & PAYOUTS -----------------
apiRouter.get('/earnings/summary', requireHost, async (req, res) => {
  const user = (req as any).user as User;
  const targetHostId = req.query.hostId && user.role === 'admin' ? (req.query.hostId as string) : user.id;
  const summary = await db.getHostFinancialSummary(targetHostId);
  return res.json(summary);
});

apiRouter.get('/ledger', requireHost, async (req, res) => {
  const user = (req as any).user as User;
  const targetHostId = req.query.hostId && user.role === 'admin' ? (req.query.hostId as string) : (user.role === 'host' ? user.id : undefined);
  const entries = await db.getLedger(targetHostId);
  return res.json(entries);
});

apiRouter.get('/payouts', requireHost, async (req, res) => {
  const user = (req as any).user as User;
  const targetHostId = user.role === 'admin' && req.query.hostId ? (req.query.hostId as string) : (user.role === 'host' ? user.id : undefined);
  const payouts = await db.getPayouts(targetHostId);
  return res.json(payouts);
});

apiRouter.get('/payouts/:id', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const payouts = await db.getPayouts();
    const payout = payouts.find(p => p.id === req.params.id || p.referenceNumber === req.params.id);
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }
    if (user.role !== 'admin' && (user.role !== 'host' || user.id !== payout.hostId)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this payout' });
    }
    return res.json(payout);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payouts', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    if (user.role !== 'host' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only hosts can request payouts' });
    }
    const { amount, method, destinationAccount } = req.body;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
    if (!amount || !method || !destinationAccount) {
      return res.status(400).json({ error: 'Amount, method, and destination account are required' });
    }
    const targetHostId = user.role === 'admin' && req.body.hostId ? req.body.hostId : user.id;
    const payout = await db.requestPayout(targetHostId, Number(amount), method, destinationAccount, user, idempotencyKey);
    return res.status(201).json(payout);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payouts/:id/reconcile', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const result = await db.reconcilePayout(req.params.id, user);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payouts/:id/cancel', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const payout = await db.cancelPayout(req.params.id, user, req.body?.reason);
    return res.json(payout);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Provider Webhook receivers with signature verification and deduplication
apiRouter.post('/webhooks/stripe', async (req, res) => {
  try {
    const signature = (req.headers['stripe-signature'] as string) || (req.headers['x-webhook-signature'] as string);
    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const result = await db.processProviderWebhook('stripe', req.body, signature, rawBody);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/webhooks/payout', async (req, res) => {
  try {
    const signature = (req.headers['x-webhook-signature'] as string) || (req.headers['stripe-signature'] as string);
    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const result = await db.processProviderWebhook('payout', req.body, signature, rawBody);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Host portal API compatibility routes
apiRouter.get('/host/payouts', requireHost, async (req, res) => {
  const user = (req as any).user as User;
  const payouts = await db.getPayouts(user.id);
  return res.json({ success: true, data: payouts });
});

apiRouter.post('/host/payouts/request', requireHost, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const amount = Number(req.body?.amount) || 50;
    const method = req.body?.method || 'ach_bank_transfer';
    const dest = req.body?.destinationAccount || user.businessDetails?.payoutAccountNumber || 'Default Verified Bank Account';
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;
    const payout = await db.requestPayout(user.id, amount, method, dest, user, idempotencyKey);
    return res.status(201).json({ success: true, data: payout });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------- REVIEWS -----------------
apiRouter.get('/facilities/:id/reviews', async (req, res) => {
  const reviews = await db.getReviews(req.params.id);
  return res.json(reviews);
});

apiRouter.post('/facilities/:id/reviews', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { bookingId, rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ error: 'Rating and comment are required' });
    }
    const review = await db.addReview(req.params.id, user.id, user.fullName, bookingId || 'direct', Number(rating), comment);
    return res.status(201).json(review);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/reviews/:id/reply', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text required' });
    const updated = await db.replyToReview(req.params.id, text, user);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- NOTIFICATIONS & MESSAGES -----------------
apiRouter.get('/notifications', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const items = await db.getNotifications(user.id);
  return res.json(items);
});

apiRouter.put('/notifications/:id/read', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  await db.markNotificationRead(req.params.id, user.id);
  return res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  await db.markAllNotificationsRead(user.id);
  return res.json({ success: true });
});

apiRouter.get('/messages', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const threads = await db.getMessages(user.id);
  return res.json(threads);
});

apiRouter.post('/messages/:threadId', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text required' });
    const thread = await db.sendMessage(req.params.threadId, user, text);
    return res.json(thread);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- DISPUTES -----------------
apiRouter.get('/disputes', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const filters: any = {};
  if (user.role === 'host') filters.hostId = user.id;
  if (user.role === 'customer') filters.customerId = user.id;
  const disputes = await db.getDisputes(filters);
  return res.json(disputes);
});

apiRouter.post('/disputes', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { bookingId, reason, statement } = req.body;
    if (!bookingId || !reason || !statement) {
      return res.status(400).json({ error: 'Booking ID, reason, and statement are required' });
    }
    const ticket = await db.createDispute({
      bookingId,
      reason,
      statement,
      customer: user
    });
    return res.status(201).json(ticket);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/disputes/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { decision, refundAmount, notes } = req.body;
    const ticket = await db.resolveDispute(req.params.id, decision, Number(refundAmount || 0), notes || '', user);
    return res.json(ticket);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- ADMIN CONSOLE -----------------
apiRouter.post('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and fullName are required' });
    }
    const adminUser = (req as any).user as User;
    const user = await db.provisionAdminUser({
      email,
      password,
      fullName,
      phone,
      role: role || 'admin',
      actor: adminUser
    });
    const { passwordHash: _hash, ...safeUser } = user;
    return res.status(201).json({ user: safeUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/facilities', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const facilities = await db.getFacilities(status ? { status: status as string } : undefined);
  return res.json(facilities);
});

apiRouter.post('/admin/facilities/:id/moderate', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { approved, notes } = req.body;
    const moderated = await db.moderateFacility(req.params.id, !!approved, notes || '', user);
    return res.json(moderated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/hosts', requireAdmin, async (req, res) => {
  const hosts = (await db.getAllHosts()).map((h) => {
    const { passwordHash: _hash, ...safeHost } = h;
    return safeHost;
  });
  return res.json(hosts);
});

apiRouter.put('/admin/hosts/:id/status', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { status } = req.body;
    const host = await db.updateHostStatus(req.params.id, status, user);
    const { passwordHash: _hash, ...safeHost } = host;
    return res.json(safeHost);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/providers', requireAdmin, async (req, res) => {
  const providers = await db.getProviders();
  return res.json(providers);
});

apiRouter.put('/admin/providers/:id', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const updated = await db.updateProvider(req.params.id, req.body, user);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/providers/:id/test', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const result = await db.testProviderConnection(req.params.id, user);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/audit-logs', requireAdmin, async (req, res) => {
  const { entityType, limit } = req.query;
  const logs = await db.getAuditLogs(entityType as string, limit ? Number(limit) : 100);
  return res.json(logs);
});

// ----------------- REPORTS & ANALYTICS -----------------
apiRouter.get('/reports/host', requireHost, async (req, res) => {
  const user = (req as any).user as User;
  const hostId = user.role === 'admin' && req.query.hostId ? (req.query.hostId as string) : user.id;

  const facilities = await db.getFacilities({ hostId });
  const facilityIds = facilities.map(f => f.id);
  const bookings = await db.getBookings({ hostId });
  const baysArrays = await Promise.all(facilityIds.map(fid => db.getBaysByFacility(fid)));
  const bays = baysArrays.flat();

  const totalBays = bays.length;
  const occupiedBays = bays.filter(b => b.status === 'occupied').length;
  const occupancyRate = totalBays > 0 ? Math.round((occupiedBays / totalBays) * 100) : 0;

  const completed = bookings.filter(b => b.status === 'completed' || b.status === 'checked_in');
  const grossRevenue = completed.reduce((acc, b) => acc + b.grossAmount, 0);
  const netEarnings = completed.reduce((acc, b) => acc + b.hostNetEarnings, 0);
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
  const cancellationRate = bookings.length > 0 ? Math.round((cancelledCount / bookings.length) * 100) : 0;

  // Hourly distribution
  const hourlyCounts = Array(24).fill(0);
  for (const b of bookings) {
    const hour = new Date(b.startTime).getHours();
    hourlyCounts[hour]++;
  }

  return res.json({
    totalBays,
    occupiedBays,
    occupancyRate,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netEarnings: Math.round(netEarnings * 100) / 100,
    totalBookings: bookings.length,
    completedBookings: completed.length,
    cancelledBookings: cancelledCount,
    cancellationRate,
    hourlyDistribution: hourlyCounts
  });
});
