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

function includesTerm(value, term) {
  return String(value ?? '').toLowerCase().includes(term);
}

function normalizeQuery(query = '') {
  return String(query).trim().toLowerCase();
}

export function getHomeContent() {
  return {
    stats: homeStats,
    universityLogos: homeUniversityLogos,
    storyCardColors,
    featuredStories: stories.slice(0, 4),
    counselorFeatures,
    processSteps,
    comparisonRows,
  };
}

export function findUniversities(filters = {}) {
  const query = normalizeQuery(filters.q);
  const country = filters.country && filters.country !== 'All' ? filters.country : '';
  const tag = filters.tag && filters.tag !== 'All' ? filters.tag : '';
  const aidOnly = filters.aid === 'true' || filters.financialAid === 'true';

  return universities.filter((university) => {
    const matchesQuery = !query ||
      includesTerm(university.name, query) ||
      includesTerm(university.location, query) ||
      includesTerm(university.country, query);
    const matchesCountry = !country || university.country === country;
    const matchesTag = !tag || university.tags.includes(tag);
    const matchesAid = !aidOnly || university.financialAid;

    return matchesQuery && matchesCountry && matchesTag && matchesAid;
  });
}

export function findPrograms(filters = {}) {
  const query = normalizeQuery(filters.q);
  const discipline = filters.discipline && filters.discipline !== 'All' ? filters.discipline : '';
  const cost = filters.cost && filters.cost !== 'All' ? filters.cost : '';
  const type = filters.type && filters.type !== 'All' ? filters.type : '';

  return programs.filter((program) => {
    const matchesQuery = !query ||
      includesTerm(program.name, query) ||
      includesTerm(program.host, query) ||
      includesTerm(program.description, query);
    const matchesDiscipline = !discipline || program.discipline.includes(discipline);
    const matchesCost = !cost || program.costType === cost;
    const matchesType = !type || program.type === type;

    return matchesQuery && matchesDiscipline && matchesCost && matchesType;
  });
}

export function findStories(filters = {}) {
  const query = normalizeQuery(filters.q);
  const tag = filters.tag && filters.tag !== 'All' ? filters.tag : '';

  return stories.filter((story) => {
    const matchesQuery = !query ||
      includesTerm(story.name, query) ||
      includesTerm(story.title, query) ||
      includesTerm(story.university, query) ||
      includesTerm(story.country, query);
    const matchesTag = !tag || story.tags.includes(tag);

    return matchesQuery && matchesTag;
  });
}

export function findAcceptances(filters = {}) {
  const query = normalizeQuery(filters.q);

  return acceptanceData.filter((acceptance) => {
    return !query ||
      includesTerm(acceptance.student, query) ||
      includesTerm(acceptance.university, query) ||
      includesTerm(acceptance.country, query) ||
      includesTerm(acceptance.scholarship, query);
  });
}
