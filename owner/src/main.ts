import { createApp } from 'vue';
import axios from 'axios';
import { globalCookiesConfig } from 'vue3-cookies';
import Toast from 'vue-toastification';
import { configure, defineRule } from 'vee-validate';
import { createPinia } from 'pinia';
import * as Sentry from '@sentry/vue';
import { BrowserTracing } from '@sentry/tracing';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import 'vue-toastification/dist/index.css';
import keycloak from './plugin/keycloak';
import MatomoPlugin from './plugin/matomo';

declare global {
  interface Window {
    _paq: any;
    Beacon: any;
  }
}

defineRule('validateEmail', (value: any) => {
  if (!value) {
    return 'register.email-not-valid';
  }
  return true;
});
defineRule('isTrue', (value: any) => {
  if (!value) {
    return 'field-required';
  }
  return true;
});
defineRule('hasValue', (value: any) => {
  if (!value) {
    return 'field-required';
  }
  return true;
});
defineRule('required', (value: any) => {
  if (typeof value === 'number') {
    if (!value && value !== 0) {
      return 'field-required';
    }
    return true;
  }
  if (!value || !value.length) {
    return 'field-required';
  }
  return true;
});
defineRule('email', (value: any) => {
  if (!value || !value.length) {
    return true;
  }
  if (!/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/.test(value)) {
    return 'register.email-not-valid';
  }
  return true;
});
defineRule('strength', (_value: any, [score]: number[]) => {
  if (score < 2) {
    return 'register.strength-not-valid';
  }
  return true;
});
defineRule('confirm', (_value: any, [password, confirm]: string[]) => {
  if (password !== confirm) {
    return 'register.confirm-not-valid';
  }
  return true;
});
defineRule('positive', (value: any) => {
  if (!value || !value.length) {
    return true;
  }
  if (value <= 0) {
    return 'number-not-positive';
  }
  return true;
});
defineRule('positiveOrNull', (value: any) => {
  if (!value || !value.length) {
    return true;
  }
  if (value < 0) {
    return 'number-not-positive-or-null';
  }
  return true;
});

configure({
  validateOnInput: true,
});

const MAIN_URL = `//${import.meta.env.VITE_MAIN_URL}`;
const OWNER_API_URL = import.meta.env.VITE_OWNER_API_URL;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'dev';

function mountApp() {
  const app = createApp(App);

  Sentry.init({
    app,
    dsn: 'https://33392525504b4dfdaa6623cc1aa56df9@sentry.incubateur.net/99',
    environment: ENVIRONMENT,
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(router),
        tracingOrigins: [
          'localhost',
          'proprietaire-dev.dossierfacile.fr',
          'proprietaire.dossierfacile.fr',
          /^\//,
        ],
      }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });

  app.use(createPinia());
  app.use(router);
  app.use(i18n);
  app.use(Toast);
  app.use(MatomoPlugin);
  app.mount('#app');
}

if (!window.location.href.includes('/validConnexion/')) {
  keycloak
    .init({ onLoad: 'check-sso', checkLoginIframe: false })
    .then((auth) => {
      const aYearFromNow = new Date();
      aYearFromNow.setFullYear(aYearFromNow.getFullYear() + 1);
      globalCookiesConfig({
        expireTimes: aYearFromNow.toUTCString(),
        path: '/',
        domain: MAIN_URL.endsWith('dossierfacile.fr') ? 'dossierfacile.fr' : 'localhost',
        secure: true,
        sameSite: 'None',
      });

      // Token Refresh
      setInterval(() => {
        keycloak
          .updateToken(70)
          .then()
          .catch(() => {
            console.log('Failed to refresh token');
          });
      }, 6000);
      if (auth) {
        axios.interceptors.request.use(
          (config) => {
            if (config.url?.includes(OWNER_API_URL) && keycloak.authenticated && config?.headers) {
              const localToken = keycloak.token;
              config.headers.Authorization = `Bearer ${localToken}`;
            }
            return config;
          },

          (error) => Promise.reject(error),
        );

        axios.interceptors.response.use(
          (response) => response,
          (error) => {
            if (
              error.response
              && (error.response.status === 401 || error.response.status === 403)
            ) {
              console.log('err');
            }
            return Promise.reject(error);
          },
        );
      }

      mountApp();
    })
    .catch(() => {
      console.log('Authenticated Failed');
      window.location.reload();
    });
} else {
  mountApp();
}
