import { RateLimiterMemory } from "rate-limiter-flexible"

export const saveFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})

export const MAX_BODY_SIZE = 5 * 1024 * 1024

export const createFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})

export const renameFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})

export const deleteFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})
