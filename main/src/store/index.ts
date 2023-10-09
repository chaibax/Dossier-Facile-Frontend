import Vue from "vue";
import Vuex from "vuex";
import i18n from "../i18n";

Vue.use(Vuex);

const DOMAIN = `${process.env.VUE_APP_DOMAIN}`;

const store = new Vuex.Store({
  state: {},
  mutations: {},
  actions: {
    setLang(_, lang) {
      i18n.locale = lang;
      i18n.fallbackLocale = "fr";
      const html = document.documentElement;
      html.setAttribute("lang", i18n.locale);
      const aYearFromNow = new Date();
      aYearFromNow.setFullYear(aYearFromNow.getFullYear() + 1);
      Vue.$cookies.set("lang", lang, aYearFromNow, "", DOMAIN);
    },
  },
  modules: {},
});

export default store;
