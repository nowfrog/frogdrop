const languages = {
  it: require('./it'),
  en: require('./en'),
  fr: require('./fr'),
  de: require('./de'),
  es: require('./es'),
  pt: require('./pt'),
  nl: require('./nl'),
  pl: require('./pl'),
  sv: require('./sv'),
  ja: require('./ja')
};

const LANGUAGE_NAMES = {
  it: 'Italiano', en: 'English', fr: 'Français', de: 'Deutsch',
  es: 'Español', pt: 'Português', nl: 'Nederlands', pl: 'Polski',
  sv: 'Svenska', ja: '日本語'
};

// Will be set by the app
let currentLanguage = 'it';

function setLanguage(lang) {
  currentLanguage = lang;
}

function getLanguage() {
  return currentLanguage;
}

function t(key) {
  const tr = languages[currentLanguage] || languages['it'];
  return tr[key] !== undefined ? tr[key] : (languages['it'][key] !== undefined ? languages['it'][key] : key);
}

function getAvailableLanguages() {
  return Object.keys(LANGUAGE_NAMES).map(code => ({ code, name: LANGUAGE_NAMES[code] }));
}

function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code;
}

module.exports = { t, setLanguage, getLanguage, getAvailableLanguages, getLanguageName, LANGUAGE_NAMES };
