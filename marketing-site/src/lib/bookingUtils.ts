export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h + hours, m);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function timeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export function generateAlternativeTimes(date: string, conflicts: any[]): string[] {
  const allSlots = ['08:00', '10:00', '12:00', '14:00', '16:00'];
  const conflictTimes = new Set(conflicts.map((c: any) => c.booking_time));
  return allSlots.filter(slot => !conflictTimes.has(slot));
}
