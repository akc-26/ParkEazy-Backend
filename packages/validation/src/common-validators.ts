export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidIndianMobile(phone: string): boolean {
  // Common format: +91 followed by 10 digits or simply 10 digits
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned);
}

export function isValidVehiclePlate(plate: string): boolean {
  // Indian vehicle registration standard format (e.g., TN01AB1234 or TN-01-AB-1234)
  const cleaned = plate.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(cleaned);
}
