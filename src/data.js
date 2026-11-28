// Projects shown in the solar system.
//
// `impact`  — stats shown in the project panel, e.g. [{ value: '150+', label: 'students reached' }].
// `gallery` — photos in public/img (first one is the planet's preview).
// `link`    — optional Instagram post; leave it out and the button is hidden.
// `planet`  — how the project looks in the solar system (brand palette).
// `moonOf`  — index of a planet: makes this a smaller project, shown as a tiny moon around that planet.
// `placeholder: true` — an empty "Coming soon" orbit. Replace these one by one with real projects.
export const projects = [
  {
    title: 'Namma Soccer School',
    date: '',
    place: 'Bangalore',
    partner: '',
    desc: 'We supported students at Namma Soccer School by providing essential educational supplies, including stationery kits containing pencils, erasers and sharpeners, along with books and exam pads. This initiative aimed to equip over 150 students with the basic resources they need to support their learning and education.',
    did: [
      'Provided stationery kits with pencils, erasers and sharpeners',
      'Donated books and exam pads',
      'Equipped over 150 students with the basic resources they need to learn',
    ],
    impact: [{ value: '150+', label: 'students reached' }],
    gallery: ['/img/namma-soccer-school-group.jpg', '/img/namma-soccer-school-classroom.jpg', '/img/namma-soccer-school-smiles.jpg'],
    planet: { a: '#22396f', b: '#f2d58a', c: '#0d1c42', bands: 1, size: 0.52 },
  },

  {
    title: 'United Way Bangalore School',
    date: '',
    place: 'Learning Essentials Initiative',
    partner: 'with United Way Bengaluru',
    desc: 'We provided young learners under the age of 7 with essential learning materials, including multiple boxes of chalk and individual chalk slates. The initiative aimed to make early learning more accessible, interactive and enjoyable. The children also warmly welcomed us by sharing homemade chikki, making the experience especially memorable.',
    did: [
      'Provided multiple boxes of chalk and individual chalk slates',
      'Made early learning more accessible, interactive and enjoyable',
      'Were warmly welcomed by the children with homemade chikki',
    ],
    impact: [{ value: 'Under 7', label: 'young learners supported' }],
    gallery: ['/img/united-way-group.jpg', '/img/united-way-slates.jpg', '/img/united-way-children.jpg', '/img/united-way-sign.jpg'],
    planet: { a: '#0d1c42', b: '#8fa6dd', c: '#fcf1d0', bands: 0, size: 0.48 },
  },

  {
    title: 'Jakkur Government School',
    date: 'Independence Day',
    place: 'Independence Day Celebration',
    partner: 'Jakkur, Bangalore',
    desc: 'We celebrated Independence Day alongside students at Jakkur Government School, taking part in the march past and joining the children in various activities, including singing and dancing. As part of the initiative, we distributed file binders, stationery kits and books to approximately 120 students, combining the spirit of celebration with a contribution towards their education.',
    did: [
      'Took part in the Independence Day march past with the students',
      'Joined the children in singing, dancing and other activities',
      'Distributed file binders, stationery kits and books',
    ],
    impact: [{ value: '~120', label: 'students reached' }],
    gallery: ['/img/jakkur-independence-day-classroom.jpg', '/img/jakkur-independence-day-march.jpg'],
    planet: { a: '#1b3a8a', b: '#f2d58a', c: '#fcf1d0', bands: 1, size: 0.46 },
  },

  {
    title: 'Daan Utsav – Day 1',
    date: '',
    place: 'Cleanliness Walkathon, BDS Nagar',
    partner: 'Celestial × EuroKids',
    desc: 'As part of Daan Utsav, we collaborated with EuroKids to celebrate gratitude and community responsibility. A key highlight was organizing a Cleanliness Walkathon in BDS Nagar, where children and staff came together with gloves, masks and broomsticks to promote cleanliness and take an active step towards a cleaner neighbourhood. We also spread appreciation to our local community heroes by distributing thank-you cards, smiley stickers and fresh fruits, making the day a meaningful celebration of kindness and collective action.',
    did: [
      'Organised a Cleanliness Walkathon in BDS Nagar with EuroKids',
      'Children and staff cleaned up together with gloves, masks and broomsticks',
      'Thanked local community heroes with cards, smiley stickers and fresh fruit',
    ],
    impact: [],
    gallery: [
      '/img/daan-utsav-eurokids-cleanup.jpg',
      '/img/daan-utsav-eurokids-earth-sign.jpg',
      '/img/daan-utsav-eurokids-smiles.jpg',
      '/img/daan-utsav-eurokids-thank-you-card.jpg',
      '/img/daan-utsav-eurokids-shop-visit.jpg',
    ],
    planet: { a: '#e8d6a6', b: '#fcf1d0', c: '#22396f', bands: 1, size: 0.6, ring: true },
  },

  {
    title: 'Daan Utsav – Day 2',
    date: '',
    place: 'Sandwich Seva, K. Narayanapura',
    partner: 'Celestial × EuroKids',
    desc: 'Continuing our collaboration with EuroKids, Day 2 of Daan Utsav celebrated the spirit of sharing through Sandwich Seva. Our young changemakers prepared fresh sandwiches with love and distributed them to people in need across K. Narayanapura. The initiative encouraged children to embrace kindness, empathy and the joy of giving, proving that even the smallest hands can make a meaningful difference.',
    did: [
      'Young changemakers prepared fresh sandwiches with love',
      'Distributed them to people in need across K. Narayanapura',
      'Encouraged kindness, empathy and the joy of giving',
    ],
    impact: [],
    gallery: [], // photos to be added: daan-utsav-sandwich-seva-*.jpg
    planet: { a: '#22396f', b: '#b9c8ee', c: '#010736', bands: 1, size: 0.44 },
  },

  // ---- Placeholders: empty orbits, filled in one by one ----
  ...[
    { a: '#f2d58a', b: '#fcf1d0', c: '#22396f', bands: 0, size: 0.34 },
    { a: '#2a4a8f', b: '#a9c0f0', c: '#0d1c42', bands: 1, size: 0.46 },
    { a: '#c8a65e', b: '#f6e3b0', c: '#0d1c42', bands: 0, size: 0.38 },
    { a: '#5b6fae', b: '#dfe6ff', c: '#010736', bands: 1, size: 0.5 },
  ].map((planet, k) => placeholder(`Project ${String(6 + k).padStart(2, '0')}`, planet)),
  // tiny moons for smaller projects (moonOf = index of the planet they circle)
  placeholder('Small project', { a: '#a9c0f0', b: '#fcf1d0', c: '#22396f', bands: 0, size: 0.13 }, 0),
  placeholder('Small project', { a: '#f2d58a', b: '#fcf1d0', c: '#22396f', bands: 0, size: 0.12 }, 3),
  placeholder('Small project', { a: '#e8d6a6', b: '#fcf1d0', c: '#0d1c42', bands: 0, size: 0.14 }, 6),
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
