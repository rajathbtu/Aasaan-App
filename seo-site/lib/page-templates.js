const { chooseVariant, renderFaqSection, resolveFaqItems } = require('./templates/shared');
const { renderCityDirectory } = require('./templates/city-directory');
const { renderHome } = require('./templates/home');
const { renderLocalityDirectory } = require('./templates/locality-directory');
const { renderNotFound } = require('./templates/not-found');
const { renderServiceCity } = require('./templates/service-city');
const { renderServiceDirectory } = require('./templates/service-directory');
const { renderServiceLocality } = require('./templates/service-locality');
const { renderServiceDescription } = require('./templates/service-description');

module.exports = {
  chooseVariant,
  renderCityDirectory,
  renderFaqSection,
  resolveFaqItems,
  renderHome,
  renderLocalityDirectory,
  renderNotFound,
  renderServiceCity,
  renderServiceDirectory,
  renderServiceLocality,
  renderServiceDescription,
};
