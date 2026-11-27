// Content sourced from @thecelestialfoundation Instagram posts.
//
// `impact` — fill in real numbers. A stat with value `null` shows as "—".
//   e.g. impact: [{ value: '120', label: 'students reached' }, { value: '12', label: 'volunteers' }]
// `planet` — how the project looks in the solar system (brand palette).
// `moonOf` — set to the index of a main project to make this a small project: a tiny moon orbiting
//   that planet. Main projects (no `moonOf`) are planets; the orbits re-space for any number of them.
export const projects = [
  {
    title: 'The Spirit of Giving',
    date: 'January 2026',
    place: 'Government school, Horamavu',
    partner: 'with Ektara',
    desc: 'Small acts, big smiles. Because giving isn’t about how much you give — but how much love you put into it.',
    did: [
      'Visited a government school in Horamavu, Bangalore',
      'Shared stationery with the students',
      'Celebrated the season together with laughter and moments of joy',
      'Partnered with Ektara to make it happen',
    ],
    impact: [{ value: null, label: 'people impacted' }],
    gallery: ['/img/spirit-of-giving.jpg'],
    link: 'https://www.instagram.com/thecelestialfoundation/reel/DTfuP9jkto4/',
    planet: { a: '#970747', b: '#ff8fb8', c: '#3d0220', bands: 1, size: 0.52 },
  },
  {
    title: 'Menstrual Awareness Session',
    date: 'December 2025',
    place: 'Kalkere Government School',
    partner: 'with Ektara',
    desc: 'A beautiful day of beautiful work — an open, judgement-free conversation about periods.',
    did: [
      'Ran a menstrual awareness session at Kalkere Government School',
      'Helped students talk openly about periods and menstrual health',
      'Worked to normalise menstruation and break the stigma around it',
      'Partnered with Ektara',
    ],
    impact: [{ value: null, label: 'people impacted' }],
    gallery: ['/img/kalkere.jpg'],
    link: 'https://www.instagram.com/_ektara._/reel/DSmV27XEkQ8/',
    planet: { a: '#5c0430', b: '#d94a86', c: '#fef4e8', bands: 0, size: 0.44 },
  },
  {
    title: 'Day of Technology',
    date: 'August 2025',
    place: 'Government school, Bangalore',
    partner: 'with Ms. Poornima',
    desc: 'Access to technology is essential for quality education and digital empowerment.',
    did: [
      'Donated a laptop to a government school on the Day of Technology',
      'Supported Ms. Poornima, who teaches the children digital literacy',
      'Helped equip students with skills to thrive in a digital world',
    ],
    impact: [
      { value: '1', label: 'laptop donated' },
      { value: null, label: 'people impacted' },
    ],
    gallery: ['/img/laptop.jpg'],
    link: 'https://www.instagram.com/thecelestialfoundation/p/DNCOCGftaUb/',
    planet: { a: '#13445a', b: '#6fa3b8', c: '#fef4e8', bands: 0, size: 0.46 },
  },
  {
    title: 'Advaya Summer Camp',
    date: 'May 2024',
    place: 'Advaya Foundation, Bangalore',
    partner: 'with Advaya Foundation',
    desc: 'Where smiles grow and memories remain.',
    did: [
      'Teamed up with Advaya Foundation to run a summer camp for children',
      'Called on volunteers to create magical memories for young adventurers',
      'Spent the camp exploring, learning and laughing together',
    ],
    impact: [{ value: null, label: 'people impacted' }],
    gallery: ['/img/advaya-2.jpg', '/img/advaya-1.jpg', '/img/camp-poster-1.jpg', '/img/camp-poster-2.jpg'],
    link: 'https://www.instagram.com/thecelestialfoundation/reel/C63MHoZy4fH/',
    planet: { a: '#d9c9a3', b: '#fef4e8', c: '#970747', bands: 1, size: 0.6, ring: true },
  },
  {
    title: 'Busting Period Myths',
    date: 'May 2024',
    place: 'Online video series',
    partner: 'with Ektara',
    desc: '“Menstruating women can cure the plague?” Taking on period myths, one at a time.',
    did: [
      'Created a myth-busting video series with Ektara',
      'Took on the myths and taboos that still surround menstruation',
      'Reached audiences online to spark honest conversations',
    ],
    impact: [{ value: null, label: 'people impacted' }],
    gallery: ['/img/period-myths.jpg'],
    link: 'https://www.instagram.com/_ektara._/reel/C6qbiRkMqZX/',
    planet: { a: '#446878', b: '#a9c4cf', c: '#13445a', bands: 1, size: 0.4 },
  },
  {
    title: 'Guess the Period Product',
    date: 'May 2024',
    place: 'Street-style video',
    partner: 'with Ektara',
    desc: 'A playful game to get people talking about the products — and conversations — that too often stay hidden.',
    did: [
      'Filmed a street-style “guess the period product” game with Ektara',
      'Got people talking openly about menstrual products',
    ],
    impact: [{ value: null, label: 'people impacted' }],
    gallery: ['/img/period-products.jpg'],
    link: 'https://www.instagram.com/_ektara._/reel/C7Omx84SK1z/',
    planet: { a: '#ff9fc2', b: '#fef4e8', c: '#970747', bands: 0, size: 0.34 },
  },

  // ---- Placeholders: replace with real projects (keep `placeholder: true` off once filled in) ----
  ...[
    { a: '#2a5f74', b: '#9fd0dc', c: '#0c3142', bands: 1, size: 0.46 },
    { a: '#7a2b52', b: '#e7a6c4', c: '#2a0a1b', bands: 0, size: 0.38 },
    { a: '#c9b48a', b: '#fef4e8', c: '#446878', bands: 1, size: 0.5 },
  ].map((planet, k) => placeholder(`Project ${String(7 + k).padStart(2, '0')}`, planet)),
  // tiny moons for smaller projects (moonOf = index of the planet they circle)
  placeholder('Small project', { a: '#a9c4cf', b: '#fef4e8', c: '#446878', bands: 0, size: 0.13 }, 0),
  placeholder('Small project', { a: '#e7a6c4', b: '#fef4e8', c: '#970747', bands: 0, size: 0.12 }, 3),
  placeholder('Small project', { a: '#d9c9a3', b: '#fef4e8', c: '#13445a', bands: 0, size: 0.14 }, 6),
]

function placeholder(title, planet, moonOf) {
  return {
    placeholder: true,
    title,
    date: 'Coming soon',
    place: 'Bangalore',
    partner: 'details on the way',
    desc: 'This orbit is reserved for a project whose story we’re still writing up. Check back soon — or help us make it happen.',
    did: ['Details coming soon'],
    impact: [],
    gallery: ['/img/logo.png'],
    link: 'https://www.instagram.com/thecelestialfoundation/',
    ...(moonOf != null ? { moonOf } : {}),
    planet,
  }
}

export const PHONE = '916360771754'

export const intents = {
  collab: {
    blurb: 'Schools, NGOs, brands, creators — if you want to build something meaningful together, we’d love to hear your idea.',
    msg: 'Hi Celestial Foundation! I’d like to collaborate with you on a project.',
  },
  fundraise: {
    blurb: 'Help us fund stationery drives, laptops for classrooms, menstrual health kits and summer camps. Every rupee goes further than you think.',
    msg: 'Hi Celestial Foundation! I’d like to help fundraise / donate.',
  },
  volunteer: {
    blurb: 'Bring your energy to our next school visit, camp or campaign. Drop us a message and we’ll get you on board.',
    msg: 'Hi Celestial Foundation! I’d like to volunteer with you.',
  },
}
