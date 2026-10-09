export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface BookingStub {
  id: string;
  referenceNumber: string;
  spaceId: string;
  facilityId: string;
  vehicleRegistration: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  totalAmountInr: number;
}
