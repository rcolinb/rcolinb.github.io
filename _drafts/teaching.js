const themes = {
  expertise: {
    title: 'Knowledge & passion',
    count: 'Mentioned in 24 of 43 comments',
    summary:
      'Students repeatedly described subject knowledge and enthusiasm, especially when expertise was translated into useful explanations.',
    quotes: [
      {
        text: 'Great teacher, very knowledgeable and cares about teaching students beyond the classroom. Quality feedback.',
        course: 'Adult Health II',
      },
      {
        text: 'You can tell that Professor Blenis enjoys what he does and he is very passionate about it.',
        course: 'Mental Health Nursing',
      },
    ],
  },
  care: {
    title: 'Care & approachability',
    count: 'Mentioned in 20 of 43 comments',
    summary:
      'Students frequently paired approachability with a visible investment in their learning, describing support as part of the instruction itself.',
    quotes: [
      {
        text: 'He is approachable, supportive, and shows that he genuinely cares about the success of his students.',
        course: 'Adult Health I',
      },
      {
        text: 'He checks on students and he truly listens to our voices and concerns.',
        course: 'Adult Health II',
      },
    ],
  },
  engagement: {
    title: 'Engagement & clinical application',
    count: 'Mentioned in 18 of 43 comments',
    summary:
      'Real-life situations, discussion, practice questions, humor, and nursing reasoning helped students connect abstract content to patient care.',
    quotes: [
      {
        text: 'He does an excellent job of integrating real-life experiences into the classroom. This made the learning process more engaging, relevant, and enjoyable.',
        course: 'Adult Health I',
      },
      {
        text: 'His lectures were very informative and interesting. I enjoyed the way he incorporated humor and real life situations into his lectures.',
        course: 'Mental Health Nursing',
      },
    ],
  },
  feedback: {
    title: 'Feedback & resources',
    count: 'Mentioned in 15 of 43 comments',
    summary:
      'Students noticed detailed feedback, responsive communication, and resources they could use to revise their thinking and prepare for what came next.',
    quotes: [
      {
        text: 'His feedback was top-tier.',
        course: 'Adult Health II',
      },
      {
        text: 'He takes his time to explain the material and he gives constructive feedback.',
        course: 'Adult Health I',
      },
    ],
  },
  clarity: {
    title: 'Clarity & scaffolding',
    count: 'Mentioned in 14 of 43 comments',
    summary:
      'Students described explanations that connected prior knowledge, slowed down difficult material, and checked for understanding before moving on.',
    quotes: [
      {
        text: 'He always stopped to make sure we understood what he was talking about before moving on to something else.',
        course: 'Mental Health Nursing',
      },
      {
        text: 'He went above and beyond to explain concepts so the whole class could understand.',
        course: 'Adult Health II',
      },
    ],
  },
  safety: {
    title: 'Psychological safety',
    count: 'Mentioned in 10 of 43 comments',
    summary:
      'Students described a classroom where uncertainty could be visible and questions could be asked without shame, including when the content was difficult or personal.',
    quotes: [
      {
        text: 'He never made us feel dumb or less than, and I appreciate that in a teacher.',
        course: 'Mental Health Nursing',
      },
      {
        text: 'He never makes students feel bad or small for not understanding a certain part of the material.',
        course: 'Adult Health II',
      },
    ],
  },
};

const nav = document.getElementById('mainNav');
const navLinks = document.getElementById('navLinks');
const navButton = document.querySelector('.nav-toggle');

window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 40);
});

window.toggleNav = function toggleNav() {
  if (!navLinks || !navButton) return;
  const isOpen = navLinks.classList.toggle('open');
  navButton.setAttribute('aria-expanded', String(isOpen));
};

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks?.classList.remove('open');
    navButton?.setAttribute('aria-expanded', 'false');
  });
});

const revealElements = document.querySelectorAll('.reveal');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  revealElements.forEach((element) => observer.observe(element));
}

const themeTabs = Array.from(document.querySelectorAll('[data-theme]'));
const themeTitle = document.getElementById('theme-title');
const themeCount = document.getElementById('theme-count');
const themeSummary = document.getElementById('theme-summary');
const themeQuotes = document.getElementById('theme-quotes');
const themePanel = document.getElementById('theme-panel');

function makeQuoteCard(quote) {
  const figure = document.createElement('figure');
  figure.className = 'student-quote';

  const blockquote = document.createElement('blockquote');
  const text = document.createElement('p');
  text.textContent = `“${quote.text}”`;
  blockquote.append(text);

  const caption = document.createElement('figcaption');
  caption.append(document.createTextNode('Anonymous student'));
  const course = document.createElement('span');
  course.textContent = quote.course;
  caption.append(course);

  figure.append(blockquote, caption);
  return figure;
}

function setTheme(themeKey, focusTab = false) {
  const theme = themes[themeKey];
  const selectedTab = themeTabs.find((tab) => tab.dataset.theme === themeKey);
  if (!theme || !selectedTab || !themeTitle || !themeCount || !themeSummary || !themeQuotes || !themePanel) return;

  themeTabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  themeCount.textContent = theme.count;
  themeTitle.textContent = theme.title;
  themeSummary.textContent = theme.summary;
  themeQuotes.replaceChildren(...theme.quotes.map(makeQuoteCard));
  themePanel.setAttribute('aria-labelledby', selectedTab.id);

  if (focusTab) selectedTab.focus();
}

themeTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setTheme(tab.dataset.theme));
  tab.addEventListener('keydown', (event) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % themeTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + themeTabs.length) % themeTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = themeTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    setTheme(themeTabs[nextIndex].dataset.theme, true);
  });
});
