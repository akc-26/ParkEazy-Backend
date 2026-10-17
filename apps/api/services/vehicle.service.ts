import {
  CustomerVehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  BookingStatus,
} from '../../../packages/contracts';
import { AppError } from '../middleware/error-handler';
import { bookingService } from './booking.service';

export class VehicleService {
  private static instance: VehicleService;

  // In-memory vehicles store keyed by userId
  private vehicles: Map<string, CustomerVehicle[]> = new Map([
    [
      'usr-customer-001',
      [
        {
          id: 'veh-001-tesla',
          userId: 'usr-customer-001',
          licensePlate: '7XYZ890',
          make: 'Tesla',
          model: 'Model 3',
          color: 'Pearl White',
          isDefault: true,
          createdAt: '2026-01-15T08:30:00Z',
          updatedAt: '2026-01-15T08:30:00Z',
        },
      ],
    ],
    [
      'usr-customer-002',
      [
        {
          id: 'veh-002-nissan',
          userId: 'usr-customer-002',
          licensePlate: 'EV-8821',
          make: 'Nissan',
          model: 'Leaf EV',
          color: 'Deep Blue',
          isDefault: true,
          createdAt: '2026-01-16T10:00:00Z',
          updatedAt: '2026-01-16T10:00:00Z',
        },
      ],
    ],
  ]);

  private constructor() {}

  public static getInstance(): VehicleService {
    if (!VehicleService.instance) {
      VehicleService.instance = new VehicleService();
    }
    return VehicleService.instance;
  }

  public getVehiclesForUser(userId: string): CustomerVehicle[] {
    const list = this.vehicles.get(userId) || [];
    return [...list];
  }

  public getVehicleById(vehicleId: string, userId: string): CustomerVehicle {
    const list = this.vehicles.get(userId) || [];
    const found = list.find((v) => v.id === vehicleId);
    if (!found) {
      throw new AppError(`Vehicle with ID '${vehicleId}' not found.`, 404, 'NOT_FOUND');
    }
    return { ...found };
  }

  public addVehicle(userId: string, data: CreateVehicleRequest): CustomerVehicle {
    const cleanedPlate = (data.licensePlate || '').trim().toUpperCase();
    if (!cleanedPlate || cleanedPlate.length < 2 || cleanedPlate.length > 12) {
      throw new AppError(
        'License plate must be between 2 and 12 alphanumeric characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const cleanedMake = (data.make || '').trim();
    if (!cleanedMake || cleanedMake.length > 50) {
      throw new AppError('Vehicle make is required (1-50 characters).', 400, 'VALIDATION_ERROR');
    }

    const cleanedModel = (data.model || '').trim();
    if (!cleanedModel || cleanedModel.length > 50) {
      throw new AppError('Vehicle model is required (1-50 characters).', 400, 'VALIDATION_ERROR');
    }

    const cleanedColor = data.color ? data.color.trim() : undefined;
    if (cleanedColor && cleanedColor.length > 30) {
      throw new AppError('Vehicle color cannot exceed 30 characters.', 400, 'VALIDATION_ERROR');
    }

    let userVehicles = this.vehicles.get(userId);
    if (!userVehicles) {
      userVehicles = [];
      this.vehicles.set(userId, userVehicles);
    }

    // Check duplicate plate for this user
    const existing = userVehicles.find((v) => v.licensePlate === cleanedPlate);
    if (existing) {
      throw new AppError(
        `Vehicle with license plate '${cleanedPlate}' is already registered in your account.`,
        409,
        'DUPLICATE_VEHICLE'
      );
    }

    const isFirstVehicle = userVehicles.length === 0;
    const isDefault = data.isDefault ?? isFirstVehicle;

    // If setting as default, clear default flag on other vehicles
    if (isDefault) {
      for (const v of userVehicles) {
        v.isDefault = false;
      }
    }

    const newVehicle: CustomerVehicle = {
      id: 'veh-' + Math.random().toString(36).substring(2, 9),
      userId,
      licensePlate: cleanedPlate,
      make: cleanedMake,
      model: cleanedModel,
      color: cleanedColor,
      isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    userVehicles.push(newVehicle);
    return { ...newVehicle };
  }

  public updateVehicle(
    vehicleId: string,
    userId: string,
    updates: UpdateVehicleRequest
  ): CustomerVehicle {
    const userVehicles = this.vehicles.get(userId) || [];
    const vehicle = userVehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      throw new AppError(`Vehicle with ID '${vehicleId}' not found.`, 404, 'NOT_FOUND');
    }

    if (updates.make !== undefined) {
      const trimmedMake = updates.make.trim();
      if (!trimmedMake || trimmedMake.length > 50) {
        throw new AppError('Vehicle make must be 1-50 characters.', 400, 'VALIDATION_ERROR');
      }
      vehicle.make = trimmedMake;
    }

    if (updates.model !== undefined) {
      const trimmedModel = updates.model.trim();
      if (!trimmedModel || trimmedModel.length > 50) {
        throw new AppError('Vehicle model must be 1-50 characters.', 400, 'VALIDATION_ERROR');
      }
      vehicle.model = trimmedModel;
    }

    if (updates.color !== undefined) {
      const trimmedColor = updates.color.trim();
      if (trimmedColor.length > 30) {
        throw new AppError('Vehicle color cannot exceed 30 characters.', 400, 'VALIDATION_ERROR');
      }
      vehicle.color = trimmedColor || undefined;
    }

    if (updates.isDefault === true) {
      for (const v of userVehicles) {
        v.isDefault = false;
      }
      vehicle.isDefault = true;
    } else if (updates.isDefault === false && vehicle.isDefault) {
      // Cannot unset default if it's the only vehicle
      if (userVehicles.length > 1) {
        vehicle.isDefault = false;
        const other = userVehicles.find((v) => v.id !== vehicle.id);
        if (other) other.isDefault = true;
      }
    }

    vehicle.updatedAt = new Date().toISOString();
    return { ...vehicle };
  }

  public deleteVehicle(vehicleId: string, userId: string): void {
    const userVehicles = this.vehicles.get(userId) || [];
    const index = userVehicles.findIndex((v) => v.id === vehicleId);
    if (index === -1) {
      throw new AppError(`Vehicle with ID '${vehicleId}' not found.`, 404, 'NOT_FOUND');
    }

    const vehicle = userVehicles[index];

    // Business rule: Cannot remove vehicle actively registered in an upcoming or ongoing reservation
    const userBookings = bookingService.getBookingsForUser(userId);
    const activeBookingWithVehicle = userBookings.find(
      (b) =>
        b.licensePlate === vehicle.licensePlate &&
        (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE)
    );

    if (activeBookingWithVehicle) {
      throw new AppError(
        `Cannot remove vehicle '${vehicle.licensePlate}': it is registered for an upcoming or active parking reservation (${activeBookingWithVehicle.id}).`,
        400,
        'VEHICLE_IN_USE'
      );
    }

    const wasDefault = vehicle.isDefault;
    userVehicles.splice(index, 1);

    // If default vehicle was removed, assign default to first remaining vehicle
    if (wasDefault && userVehicles.length > 0) {
      userVehicles[0].isDefault = true;
    }
  }
}

export const vehicleService = VehicleService.getInstance();
