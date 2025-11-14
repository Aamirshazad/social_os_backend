import { ContentQueue, QueueSchedule } from '@/types';

const STORAGE_KEY = 'contentQueues';

export function getAllQueues(): ContentQueue[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: ContentQueue): void {
  const queues = getAllQueues();
  const index = queues.findIndex(q => q.id === queue.id);

  if (index !== -1) {
    queues[index] = queue;
  } else {
    queues.push(queue);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
}

export function deleteQueue(id: string): void {
  const queues = getAllQueues().filter(q => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
}

export function getQueueById(id: string): ContentQueue | undefined {
  return getAllQueues().find(q => q.id === id);
}

export function createQueue(
  name: string,
  description: string,
  schedule: QueueSchedule
): ContentQueue {
  const queue: ContentQueue = {
    id: crypto.randomUUID(),
    name,
    description,
    schedule,
    postIds: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  saveQueue(queue);
  return queue;
}

export function addPostToQueue(queueId: string, postId: string): void {
  const queue = getQueueById(queueId);
  if (queue && !queue.postIds.includes(postId)) {
    queue.postIds.push(postId);
    saveQueue(queue);
  }
}

export function removePostFromQueue(queueId: string, postId: string): void {
  const queue = getQueueById(queueId);
  if (queue) {
    queue.postIds = queue.postIds.filter(id => id !== postId);
    saveQueue(queue);
  }
}

export function getNextPostInQueue(queueId: string): string | undefined {
  const queue = getQueueById(queueId);
  return queue?.postIds[0];
}

export function reorderQueuePosts(queueId: string, postIds: string[]): void {
  const queue = getQueueById(queueId);
  if (queue) {
    queue.postIds = postIds;
    saveQueue(queue);
  }
}

// Check if it's time to publish from queue
export function shouldPublishFromQueue(queue: ContentQueue): boolean {
  if (!queue.isActive || queue.postIds.length === 0) return false;

  const now = new Date();
  const schedule = queue.schedule;
  const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);

  // Check if current time matches schedule time (within 1 minute tolerance)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduleMinutes = hours * 60 + minutes;
  const isTimeMatch = Math.abs(currentMinutes - scheduleMinutes) <= 1;

  if (!isTimeMatch) return false;

  switch (schedule.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return schedule.daysOfWeek?.includes(now.getDay()) || false;
    case 'monthly':
      return now.getDate() === schedule.dayOfMonth;
    default:
      return false;
  }
}
