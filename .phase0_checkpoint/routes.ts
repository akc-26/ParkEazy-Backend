import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { User, VehicleCompatibility } from './types';

export const apiRouter = Router();

// Middleware to resolve current user from authorization header or session header
export function getAuthenticatedUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  const customUserId = req.headers['x-user-id'] as string;

  if (customUserId) {
    const user = db.findUserById(customUserId);
    if (user) return user;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const user = db.findUserById(token) || db.findUserByEmail(token);
      if (user) return user;
    }
  }

  // Strict: Unauthenticated requests return null
  return null;
}

// Auth Middleware guard for any authenticated user
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  (req as any).user = user;
  next();
}

// Auth guard specifically for Host accounts
function requireHost(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Host authentication required. Please sign in to the Host Portal.' });
  }
  if (user.role !== 'host' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Host account privileges required.' });
  }
  (req as any).user = user;
  next();
}

// Auth guard specifically for Administrator accounts
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Administrator authentication required. Please sign in to Admin Moderation.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  (req as any).user = user;
  next();
}

// ----------------- AUTH ROUTES -----------------
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.findUserByEmail(email);
  if (!user || !db.verifyPassword(user, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
  }

  // Token is user ID (or HMAC token in production)
  return res.json({
    token: user.id,
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

apiRouter.post('/auth/register', (req, res) => {
  try {
    const { email, password, fullName, phone, role, businessDetails } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    const newUser = db.createUser({
      email,
      password,
      fullName,
      phone,
      role,
      businessDetails
    });

    return res.status(201).json({
      token: newUser.id,
      user: newUser
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user });
});

apiRouter.put('/auth/profile', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const updated = db.updateUserProfile(user.id, req.body);
    return res.json({ user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const user = db.findUserByEmail(email);
  return res.json({
    success: true,
    message: user
      ? `A password recovery link has been dispatched to ${email}.`
      : 'If an account exists with this email address, password recovery instructions have been sent.'
  });
});

// Demo switch route to easily switch test accounts in preview
apiRouter.get('/auth/demo-users', (req, res) => {
  const users = [
    db.findUserById('usr_host1'),
    db.findUserById('usr_host2'),
    db.findUserById('usr_cust1'),
    db.findUserById('usr_admin1')
  ].filter(Boolean);
  return res.json(users);
});

// ----------------- FACILITIES -----------------
apiRouter.get('/facilities', (req, res) => {
  const { hostId, status, city } = req.query;
  const facilities = db.getFacilities({
    hostId: hostId as string,
    status: status as string,
    city: city as string
  });
  return res.json(facilities);
});

apiRouter.get('/facilities/:id', (req, res) => {
  const facility = db.getFacilityById(req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  const bays = db.getBaysByFacility(facility.id);
  const pricingRules = db.getPricingRules(facility.id);
  const reviews = db.getReviews(facility.id);
  return res.json({ ...facility, bays, pricingRules, reviews });
});

apiRouter.post('/facilities', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const facility = db.createFacility(user.id, req.body);
    return res.status(201).json(facility);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/facilities/:id', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = db.getFacilityById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Facility not found' });
    if (existing.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }
    const facility = db.updateFacility(req.params.id, req.body, user);
    return res.json(facility);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/facilities/:id/submit', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const existing = db.getFacilityById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Facility not found' });
    if (existing.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }
    const facility = db.submitFacilityForReview(req.params.id, user);
    return res.json(facility);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/facilities/:id/toggle-status', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const facility = db.getFacilityById(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (facility.hostId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this facility' });
    }

    const nextStatus = facility.status === 'active' ? 'suspended' : 'active';
    const updated = db.updateFacility(facility.id, { status: nextStatus }, user);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- PARKING BAYS -----------------
apiRouter.get('/facilities/:id/bays', (req, res) => {
  const bays = db.getBaysByFacility(req.params.id);
  return res.json(bays);
});

apiRouter.post('/facilities/:id/bays', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const bay = db.createBay(req.params.id, req.body, user);
    return res.status(201).json(bay);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/facilities/:id/bays/bulk', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { prefix, startIndex, count, zone, vehicleCompatibility, dimensions, isAccessibleADA, hasEvCharger, evPowerKw, hourlyRateMultiplier } = req.body;

    if (!prefix || !count || count <= 0) {
      return res.status(400).json({ error: 'Prefix and positive count are required' });
    }

    const created = db.createBulkBays(
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

apiRouter.put('/bays/:id', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const bay = db.updateBay(req.params.id, req.body, user);
    return res.json(bay);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/bays/:id/status', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const bay = db.setBayStatus(req.params.id, status, reason, user);
    return res.json(bay);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/bays/:id', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const success = db.deleteBay(req.params.id, user);
    return res.json({ success });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- PRICING & QUOTES -----------------
apiRouter.get('/facilities/:id/pricing-rules', (req, res) => {
  const rules = db.getPricingRules(req.params.id);
  return res.json(rules);
});

apiRouter.post('/facilities/:id/pricing-rules', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const rule = db.createPricingRule(req.params.id, req.body, user);
    return res.status(201).json(rule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/pricing-rules/:id', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    const rule = db.updatePricingRule(req.params.id, req.body, user);
    return res.json(rule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/pricing/estimate', (req, res) => {
  try {
    const { facilityId, startTime, endTime, bayMultiplier } = req.body;
    if (!facilityId || !startTime || !endTime) {
      return res.status(400).json({ error: 'facilityId, startTime, and endTime are required' });
    }
    const estimate = db.calculateQuote(facilityId, startTime, endTime, bayMultiplier || 1.0);
    return res.json(estimate);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- AVAILABILITY HOLDS -----------------
apiRouter.post('/holds', (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const userId = user ? user.id : (req.body.customerId || 'usr_cust1');
    const { bayId, facilityId, startTime, endTime } = req.body;
    if (!bayId || !facilityId || !startTime || !endTime) {
      return res.status(400).json({ error: 'bayId, facilityId, startTime, and endTime are required' });
    }
    const hold = db.createHold(bayId, facilityId, userId, startTime, endTime);
    return res.status(201).json(hold);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/holds/:id', (req, res) => {
  db.releaseHold(req.params.id);
  return res.json({ success: true });
});

// ----------------- BOOKINGS -----------------
apiRouter.get('/bookings', (req, res) => {
  const user = getAuthenticatedUser(req);
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

  const bookings = db.getBookings(filters);
  return res.json(bookings);
});

apiRouter.get('/bookings/:id', (req, res) => {
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const facility = db.getFacilityById(booking.facilityId);
  const bay = db.getBayById(booking.bayId);
  return res.json({ ...booking, facility, bay });
});

apiRouter.post('/bookings', (req, res) => {
  try {
    let user = getAuthenticatedUser(req);
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
      user = db.findUserByEmail(email) || db.createUser({
        email,
        password: 'driver_' + Math.random().toString(36).substring(7),
        fullName: customerName || 'Alex Driver',
        phone: customerPhone || '+1 (206) 555-0188',
        role: 'customer'
      });
    }

    const booking = db.createBooking({
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
apiRouter.post('/bookings/:id/check-in', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const booking = db.checkInBooking(req.params.id, user);
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
apiRouter.post('/bookings/:id/check-out', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const booking = db.checkOutBooking(req.params.id, user);
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
apiRouter.post('/bookings/:id/extend', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { hours } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ error: 'Valid hours required' });
    const booking = db.extendBooking(req.params.id, Number(hours), user);
    return res.json(booking);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Cancel
apiRouter.post('/bookings/:id/cancel', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { reason } = req.body;
    const booking = db.cancelBooking(req.params.id, reason || 'Customer requested cancellation', user);
    return res.json(booking);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- FINANCIALS & PAYOUTS -----------------
apiRouter.get('/earnings/summary', requireHost, (req, res) => {
  const user = (req as any).user as User;
  const targetHostId = req.query.hostId && user.role === 'admin' ? (req.query.hostId as string) : user.id;
  const summary = db.getHostFinancialSummary(targetHostId);
  return res.json(summary);
});

apiRouter.get('/ledger', requireHost, (req, res) => {
  const user = (req as any).user as User;
  const targetHostId = req.query.hostId && user.role === 'admin' ? (req.query.hostId as string) : (user.role === 'host' ? user.id : undefined);
  const entries = db.getLedger(targetHostId);
  return res.json(entries);
});

apiRouter.get('/payouts', requireHost, (req, res) => {
  const user = (req as any).user as User;
  const targetHostId = user.role === 'admin' && req.query.hostId ? (req.query.hostId as string) : (user.role === 'host' ? user.id : undefined);
  const payouts = db.getPayouts(targetHostId);
  return res.json(payouts);
});

apiRouter.post('/payouts', requireHost, (req, res) => {
  try {
    const user = (req as any).user as User;
    if (user.role !== 'host') {
      return res.status(403).json({ error: 'Only hosts can request payouts' });
    }
    const { amount, method, destinationAccount } = req.body;
    if (!amount || !method || !destinationAccount) {
      return res.status(400).json({ error: 'Amount, method, and destination account are required' });
    }
    const payout = db.requestPayout(user.id, Number(amount), method, destinationAccount, user);
    return res.status(201).json(payout);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- REVIEWS -----------------
apiRouter.get('/facilities/:id/reviews', (req, res) => {
  const reviews = db.getReviews(req.params.id);
  return res.json(reviews);
});

apiRouter.post('/facilities/:id/reviews', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { bookingId, rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ error: 'Rating and comment are required' });
    }
    const review = db.addReview(req.params.id, user.id, user.fullName, bookingId || 'direct', Number(rating), comment);
    return res.status(201).json(review);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/reviews/:id/reply', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text required' });
    const updated = db.replyToReview(req.params.id, text, user);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- NOTIFICATIONS & MESSAGES -----------------
apiRouter.get('/notifications', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const items = db.getNotifications(user.id);
  return res.json(items);
});

apiRouter.put('/notifications/:id/read', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  db.markNotificationRead(req.params.id, user.id);
  return res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  db.markAllNotificationsRead(user.id);
  return res.json({ success: true });
});

apiRouter.get('/messages', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const threads = db.getMessages(user.id);
  return res.json(threads);
});

apiRouter.post('/messages/:threadId', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text required' });
    const thread = db.sendMessage(req.params.threadId, user, text);
    return res.json(thread);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- DISPUTES -----------------
apiRouter.get('/disputes', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const filters: any = {};
  if (user.role === 'host') filters.hostId = user.id;
  if (user.role === 'customer') filters.customerId = user.id;
  const disputes = db.getDisputes(filters);
  return res.json(disputes);
});

apiRouter.post('/disputes', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { bookingId, reason, statement } = req.body;
    if (!bookingId || !reason || !statement) {
      return res.status(400).json({ error: 'Booking ID, reason, and statement are required' });
    }
    const ticket = db.createDispute({
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

apiRouter.post('/disputes/:id/resolve', requireAdmin, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { decision, refundAmount, notes } = req.body;
    const ticket = db.resolveDispute(req.params.id, decision, Number(refundAmount || 0), notes || '', user);
    return res.json(ticket);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------- ADMIN CONSOLE -----------------
apiRouter.get('/admin/facilities', requireAdmin, (req, res) => {
  const { status } = req.query;
  const facilities = db.getFacilities(status ? { status: status as string } : undefined);
  return res.json(facilities);
});

apiRouter.post('/admin/facilities/:id/moderate', requireAdmin, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { approved, notes } = req.body;
    const moderated = db.moderateFacility(req.params.id, !!approved, notes || '', user);
    return res.json(moderated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/hosts', requireAdmin, (req, res) => {
  const hosts = db.getAllHosts();
  return res.json(hosts);
});

apiRouter.put('/admin/hosts/:id/status', requireAdmin, (req, res) => {
  try {
    const user = (req as any).user as User;
    const { status } = req.body;
    const host = db.updateHostStatus(req.params.id, status, user);
    return res.json(host);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/providers', requireAdmin, (req, res) => {
  const providers = db.getProviders();
  return res.json(providers);
});

apiRouter.put('/admin/providers/:id', requireAdmin, (req, res) => {
  try {
    const user = (req as any).user as User;
    const updated = db.updateProvider(req.params.id, req.body, user);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/providers/:id/test', requireAdmin, (req, res) => {
  try {
    const user = (req as any).user as User;
    const result = db.testProviderConnection(req.params.id, user);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/audit-logs', requireAdmin, (req, res) => {
  const { entityType, limit } = req.query;
  const logs = db.getAuditLogs(entityType as string, limit ? Number(limit) : 100);
  return res.json(logs);
});

// ----------------- REPORTS & ANALYTICS -----------------
apiRouter.get('/reports/host', requireHost, (req, res) => {
  const user = (req as any).user as User;
  const hostId = user.role === 'admin' && req.query.hostId ? (req.query.hostId as string) : user.id;

  const facilities = db.getFacilities({ hostId });
  const facilityIds = facilities.map(f => f.id);
  const bookings = db.getBookings({ hostId });
  const bays = facilityIds.flatMap(fid => db.getBaysByFacility(fid));

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
