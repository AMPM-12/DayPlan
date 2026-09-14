import { v4 as uuid } from 'uuid'
import type { Activity } from '../types'

export function buildDefaultPlan(): Activity[] {
  return [
    {
      id: uuid(),
      title: 'Morning Routine',
      startTime: '06:45',
      durationMin: 30,
      category: 'personal',
    },
    {
      id: uuid(),
      title: 'Breakfast',
      startTime: '07:15',
      durationMin: 45,
      category: 'health',
    },
    {
      id: uuid(),
      title: 'Focus Session 1',
      startTime: '08:00',
      durationMin: 90,
      category: 'work',
      isFocusSession: true,
    },
    {
      id: uuid(),
      title: 'Walk / Fresh Air',
      startTime: '09:30',
      durationMin: 30,
      category: 'health',
    },
    {
      id: uuid(),
      title: 'Focus Session 2',
      startTime: '10:00',
      durationMin: 90,
      category: 'work',
      isFocusSession: true,
    },
    {
      id: uuid(),
      title: 'Lunch',
      startTime: '11:30',
      durationMin: 60,
      category: 'health',
    },
    {
      id: uuid(),
      title: 'Focus Session 3',
      startTime: '12:30',
      durationMin: 90,
      category: 'work',
      isFocusSession: true,
    },
    {
      id: uuid(),
      title: 'Exercise',
      startTime: '14:00',
      durationMin: 45,
      category: 'health',
    },
    {
      id: uuid(),
      title: 'Read / Learn Something',
      startTime: '14:45',
      durationMin: 30,
      category: 'personal',
    },
    {
      id: uuid(),
      title: 'Focus Session 4',
      startTime: '15:15',
      durationMin: 90,
      category: 'work',
      isFocusSession: true,
    },
    {
      id: uuid(),
      title: 'Dinner Prep & Family Time',
      startTime: '16:45',
      durationMin: 75,
      category: 'family',
    },
    {
      id: uuid(),
      title: 'Wind-Down',
      startTime: '18:00',
      durationMin: 240,
      category: 'free',
    },
  ]
}
