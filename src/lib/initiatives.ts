export type Initiative = {
  slug: string;
  title: string;
  shortTitle: string;
  headline: string;
  intro: string;
  image: string;
  imageAlt: string;
  color: string;
  purpose: string;
  chapters: { title: string; body: string; focus: string; detail: string }[];
};

// Informational focus areas, not promises of individual grants or fund allocation.
export const initiatives: Initiative[] = [
  {
    slug: 'education', title: 'Education & Scholarships', shortTitle: 'Education',
    headline: 'Keep a future full of possibility.',
    intro: 'Learning needs more than ambition. Explore how scholarships, grants, and everyday school supplies can help students keep moving forward.',
    image: '/images/money-donation/education.webp',
    imageAlt: 'Illustration of a student receiving a school bag and learning supplies',
    color: 'from-[#b98543] to-[#95602b]',
    purpose: 'A school bag is a beginning. The bigger goal is the chance to keep learning.',
    chapters: [
      { title: 'Start with the essentials.', body: 'Notebooks, books, and school supplies are small things with an everyday purpose. Access to them helps students arrive ready to participate.', focus: 'Learning supplies', detail: 'Practical tools for the classroom and study at home.' },
      { title: 'Make room for learning.', body: 'Education expenses can compete with a family’s daily needs. Scholarships and grants can ease that pressure and support continued study.', focus: 'Scholarships & grants', detail: 'Financial support that puts education within reach.' },
      { title: 'Look beyond one school year.', body: 'Continuing education gives young people more opportunities to develop their interests, build confidence, and make choices about their future.', focus: 'Continuity', detail: 'A longer view of learning, confidence, and opportunity.' },
    ],
  },
  {
    slug: 'healthcare', title: 'Healthcare & Medical Aid', shortTitle: 'Healthcare',
    headline: 'Care should feel closer to home.',
    intro: 'Community health camps and medical support help bring attention to people whose healthcare needs can otherwise go unmet.',
    image: '/images/money-donation/healthcare.webp',
    imageAlt: 'Illustration of a doctor welcoming an older woman at a community health camp',
    color: 'from-[#c4774e] to-[#9c4824]',
    purpose: 'Behind every medical need is a person who deserves to be heard.',
    chapters: [
      { title: 'Bring care into the community.', body: 'Distance, cost, and uncertainty can make seeking help difficult. Community health camps create a more approachable place to begin a conversation.', focus: 'Community health camps', detail: 'A local setting for people to connect with care.' },
      { title: 'Support the person, not just the need.', body: 'Medical support is about dignity as well as access. Listening to people and understanding their circumstances helps keep that support relevant.', focus: 'Medical support', detail: 'Attention to healthcare needs and individual circumstances.' },
      { title: 'Help families move forward.', body: 'When health concerns demand attention, daily life can become harder to manage. Timely support can help families focus on their wellbeing.', focus: 'Family wellbeing', detail: 'Support with the person and their family in mind.' },
    ],
  },
  {
    slug: 'community-welfare', title: 'Community Welfare', shortTitle: 'Community welfare',
    headline: 'Stronger communities begin with each other.',
    intro: 'From nutrition support to emergency relief, community welfare connects immediate help with the everyday foundations of a more secure life.',
    image: '/images/money-donation/community.webp',
    imageAlt: 'Illustration of neighbours gathering for a village community discussion',
    color: 'from-brand-400 to-brand-600',
    purpose: 'Support matters most when it responds to what a community actually needs.',
    chapters: [
      { title: 'Listen to everyday needs.', body: 'Community welfare begins with understanding people’s circumstances. Nutrition and essential support can help address pressures on daily life.', focus: 'Everyday wellbeing', detail: 'Nutrition and essential support for families.' },
      { title: 'Be there when life changes.', body: 'Emergencies can disrupt a household in an instant. Disaster relief focuses attention on urgent needs while communities work toward recovery.', focus: 'Relief & recovery', detail: 'Support in moments of disruption and uncertainty.' },
      { title: 'Build with the community.', body: 'Lasting development depends on people taking part in the decisions that affect them. A community-centred approach values local voices and shared responsibility.', focus: 'Community development', detail: 'Local participation and a shared sense of ownership.' },
    ],
  },
  {
    slug: 'empowerment', title: 'Women & Youth Empowerment', shortTitle: 'Empowerment',
    headline: 'More confidence. More choices. More possibility.',
    intro: 'An inclusive society makes room for women and young people to learn, participate, and shape their own futures.',
    image: '/images/money-donation/empowerment.webp',
    imageAlt: 'Illustration of women learning and working on handmade crafts together',
    color: 'from-[#a66e4b] to-[#795039]',
    purpose: 'Empowerment means having a voice in what comes next.',
    chapters: [
      { title: 'Create room to participate.', body: 'Being included matters. Supportive spaces give women and young people opportunities to share ideas, learn from one another, and be heard.', focus: 'Participation', detail: 'An inclusive space for learning and connection.' },
      { title: 'Build confidence through learning.', body: 'Practical learning and shared experience can help people recognise their abilities. The aim is greater confidence and more choices, not a single prescribed path.', focus: 'Skills & confidence', detail: 'Learning that encourages independence and personal agency.' },
      { title: 'Let people shape their future.', body: 'An inclusive community values women and young people as contributors and decision-makers. Empowerment is about supporting that agency over time.', focus: 'Self-reliance', detail: 'A future shaped by people’s own aspirations.' },
    ],
  },
];

export function getInitiative(slug: string) {
  return initiatives.find((initiative) => initiative.slug === slug);
}
