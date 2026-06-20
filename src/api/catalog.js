import { acceptanceData, universities } from '../../shared/data/universities.js';
import { programs } from '../../shared/data/programs.js';
import { stories } from '../../shared/data/stories.js';
import {
  comparisonRows,
  counselorFeatures,
  homeStats,
  homeUniversityLogos,
  processSteps,
  storyCardColors,
} from '../../shared/data/home.js';

export {
  acceptanceData,
  comparisonRows,
  counselorFeatures,
  homeStats,
  homeUniversityLogos,
  processSteps,
  programs,
  stories,
  storyCardColors,
  universities,
};

export function getFeaturedStories(limit = 4) {
  return stories.slice(0, limit);
}

export function getFeaturedUniversities(limit = 16) {
  return homeUniversityLogos.slice(0, limit);
}
