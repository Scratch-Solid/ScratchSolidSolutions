// Database for Cleaner Profiles and Bookings
// This will be replaced with Directus API calls

export interface CleanerProfile {
  id: string;
  paysheetCode: string; // Scratch12345, Solid67890, Trans11111
  firstName: string;
  lastName: string;
  residentialAddress: string;
  cellphone: string;
  email: string; // Optional
  specialties: string[];
  rating: number;
  profilePicture: string; // Base64 or URL
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  department: 'cleaning' | 'digital' | 'transport';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CleanerPublicProfile {
  firstName: string;
  lastName: string;
  profilePicture: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  cleanerId?: string; // Assigned cleaner
  location: string;
  serviceType: string;
  date: string;
  time: string;
  status: 'pending' | 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled';
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  bookingId: string;
  cleanerId: string;
  completedAt: string;
  earnings: number; // R150 per completion
}

// Mock database
let mockCleanerProfiles: CleanerProfile[] = [
  {
    id: "1",
    paysheetCode: "Scratch12345",
    firstName: "Sarah",
    lastName: "Johnson",
    residentialAddress: "123 Main St, Johannesburg",
    cellphone: "+27 69 673 5947",
    email: "sarah.johnson@scratchsolid.com",
    specialties: ["Standard Cleaning", "Deep Clean"],
    rating: 4.8,
    profilePicture: "",
    emergencyContactName: "John Johnson",
    emergencyContactPhone: "+27 69 673 5948",
    emergencyContact2Name: "Mary Johnson",
    emergencyContact2Phone: "+27 69 673 5949",
    department: "cleaning",
    status: "active",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15"
  }
];

let mockBookings: Booking[] = [];
let mockTaskCompletions: TaskCompletion[] = [];

// API Functions - will be replaced with Directus API calls

// Cleaner Profile Functions
export async function getCleanerProfile(paysheetCode: string): Promise<CleanerProfile | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleaner = mockCleanerProfiles.find(c => c.paysheetCode === paysheetCode);
      resolve(cleaner || null);
    }, 100);
  });
}

export async function getCleanerProfileById(id: string): Promise<CleanerProfile | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleaner = mockCleanerProfiles.find(c => c.id === id);
      resolve(cleaner || null);
    }, 100);
  });
}

export async function getCleanerPublicProfile(cleanerId: string): Promise<CleanerPublicProfile | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleaner = mockCleanerProfiles.find(c => c.id === cleanerId);
      if (cleaner) {
        resolve({
          firstName: cleaner.firstName,
          lastName: cleaner.lastName,
          profilePicture: cleaner.profilePicture
        });
      } else {
        resolve(null);
      }
    }, 100);
  });
}

export async function updateCleanerProfile(paysheetCode: string, updates: Partial<CleanerProfile>): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleaner = mockCleanerProfiles.find(c => c.paysheetCode === paysheetCode);
      if (cleaner) {
        Object.assign(cleaner, updates, { updatedAt: new Date().toISOString() });
        resolve(true);
      } else {
        resolve(false);
      }
    }, 100);
  });
}

export async function updateCleanerProfilePicture(paysheetCode: string, picture: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleaner = mockCleanerProfiles.find(c => c.paysheetCode === paysheetCode);
      if (cleaner) {
        cleaner.profilePicture = picture;
        cleaner.updatedAt = new Date().toISOString();
        resolve(true);
      } else {
        resolve(false);
      }
    }, 100);
  });
}

export async function getAllCleaners(): Promise<CleanerProfile[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCleanerProfiles);
    }, 100);
  });
}

// Booking Functions
export async function createBooking(booking: Omit<Booking, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newBooking: Booking = {
        ...booking,
        id: Date.now().toString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockBookings.push(newBooking);
      resolve(newBooking);
    }, 100);
  });
}

export async function getBookingsByCleaner(cleanerId: string): Promise<Booking[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bookings = mockBookings.filter(b => b.cleanerId === cleanerId);
      resolve(bookings);
    }, 100);
  });
}

export async function getPendingBookings(): Promise<Booking[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bookings = mockBookings.filter(b => b.status === 'pending');
      resolve(bookings);
    }, 100);
  });
}

export async function assignBookingToCleaner(bookingId: string, cleanerId: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const booking = mockBookings.find(b => b.id === bookingId);
      if (booking) {
        booking.cleanerId = cleanerId;
        booking.status = 'assigned';
        booking.updatedAt = new Date().toISOString();
        resolve(true);
      } else {
        resolve(false);
      }
    }, 100);
  });
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const booking = mockBookings.find(b => b.id === bookingId);
      if (booking) {
        booking.status = status;
        booking.updatedAt = new Date().toISOString();
        resolve(true);
      } else {
        resolve(false);
      }
    }, 100);
  });
}

// Task Completion Functions
export async function recordTaskCompletion(bookingId: string, cleanerId: string): Promise<TaskCompletion> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const completion: TaskCompletion = {
        id: Date.now().toString(),
        bookingId,
        cleanerId,
        completedAt: new Date().toISOString(),
        earnings: 150
      };
      mockTaskCompletions.push(completion);
      resolve(completion);
    }, 100);
  });
}

export async function getTaskCompletionsByCleaner(cleanerId: string, month?: string): Promise<TaskCompletion[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let completions = mockTaskCompletions.filter(tc => tc.cleanerId === cleanerId);
      if (month) {
        completions = completions.filter(tc => tc.completedAt.startsWith(month));
      }
      resolve(completions);
    }, 100);
  });
}

export async function getCleanerEarnings(cleanerId: string): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const completions = mockTaskCompletions.filter(tc => tc.cleanerId === cleanerId);
      const total = completions.reduce((sum, tc) => sum + tc.earnings, 0);
      resolve(total);
    }, 100);
  });
}

// Helper function to assign next available booking to cleaner
export async function assignNextBookingToCleaner(cleanerId: string): Promise<Booking | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const nextBooking = mockBookings.find(b => b.status === 'pending');
      if (nextBooking) {
        assignBookingToCleaner(nextBooking.id, cleanerId).then(() => {
          resolve(nextBooking);
        });
      } else {
        resolve(null);
      }
    }, 100);
  });
}
