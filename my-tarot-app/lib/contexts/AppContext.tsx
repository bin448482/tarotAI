import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService from '../services/AuthService';
import AIReadingService from '../services/AIReadingService';
import { DatabaseConnectionManager } from '../database/connection';
import { UserDatabaseService } from '../database/user-db';
import { initializeI18n, changeLanguage, getAvailableLocales, DEFAULT_LOCALE, type AppLocale } from '../i18n';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface AppState {
  locale: AppLocale;
  availableLocales: readonly { code: AppLocale; label: string }[];
  isLocaleLoading: boolean;
  localeError: string | null;

  isDatabaseInitialized: boolean;
  isInitializingDatabase: boolean;
  databaseError: string | null;

  isAIServiceAvailable: boolean;
  isCheckingAIService: boolean;
  aiServiceError: string | null;

  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  userToken: string | null;
  userId: string | null;

  isAppInitialized: boolean;
  initializationError: string | null;
}

interface AppContextType {
  state: AppState;
  actions: {
    initializeApp: () => Promise<void>;
    refreshAIServiceStatus: () => Promise<void>;
    refreshAuthStatus: () => Promise<void>;
    setLocale: (locale: AppLocale) => Promise<void>;
  };
}

const AVAILABLE_LOCALE_OPTIONS = getAvailableLocales();

const defaultState: AppState = {
  locale: DEFAULT_LOCALE,
  availableLocales: AVAILABLE_LOCALE_OPTIONS,
  isLocaleLoading: true,
  localeError: null,

  isDatabaseInitialized: false,
  isInitializingDatabase: true,
  databaseError: null,

  isAIServiceAvailable: false,
  isCheckingAIService: true,
  aiServiceError: null,

  isAuthenticated: false,
  isAuthenticating: true,
  authError: null,
  userToken: null,
  userId: null,

  isAppInitialized: false,
  initializationError: null,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [hasBootstrapCompleted, setHasBootstrapCompleted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrapLocale = async () => {
      try {
        const locale = await initializeI18n();
        if (!isMounted) {
          return;
        }

        setState(prev => ({
          ...prev,
          locale,
          isLocaleLoading: false,
          localeError: null,
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Localization initialization failed';
        console.warn('[AppContext] Locale bootstrap failed', error);
        setState(prev => ({
          ...prev,
          isLocaleLoading: false,
          localeError: message,
        }));
      } finally {
        if (isMounted) {
          setHasBootstrapCompleted(true);
        }
      }
    };

    bootstrapLocale();

    return () => {
      isMounted = false;
    };
  }, []);

  const initializeApp = async () => {
    console.log('🚀 Starting app initialization...');

    let resolvedLocale: AppLocale = state.locale ?? DEFAULT_LOCALE;
    let localeError: string | null = null;

    setState(prev => ({
      ...prev,
      isLocaleLoading: true,
      localeError: null,
      isInitializingDatabase: true,
      databaseError: null,
      isCheckingAIService: true,
      aiServiceError: null,
      isAuthenticating: true,
      authError: null,
      initializationError: null,
      isAppInitialized: false,
    }));

    try {
      console.log('🌐 Initializing localization...');
      try {
        resolvedLocale = await initializeI18n();
        console.log('✅ Localization initialized with locale:', resolvedLocale);
      } catch (error) {
        localeError = error instanceof Error ? error.message : 'Localization initialization failed';
        console.error('❌ Localization initialization error:', error);
      }

      // 1. 初始化数据库（必须最先完成）
      console.log('🗄️ Initializing database...');
      const connectionManager = DatabaseConnectionManager.getInstance();
      const dbResult = await connectionManager.initialize();

      if (!dbResult.success) {
        throw new Error(`Database initialization failed: ${dbResult.error}`);
      }

      console.log('✅ Database initialized successfully');
      const userDbService = UserDatabaseService.getInstance();

      // 2. 检查AI服务健康状态
      console.log('🔍 Checking AI service health...');
      const aiService = AIReadingService.getInstance();
      let isAIServiceAvailable = false;
      let aiServiceError: string | null = null;

      try {
        const healthCheck = await aiService.checkServiceHealth();
        isAIServiceAvailable = healthCheck;
        if (!healthCheck) {
          aiServiceError = 'AI service is unavailable';
          console.warn('⚠️ AI service health check returned unavailable');
        } else {
          console.log('✅ AI service is reachable');
        }
      } catch (error) {
        aiServiceError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ AI service health check failed:', error);
      }

      // 3. 初始化匿名用户认证
      console.log('👤 Initializing anonymous user...');
      const authService = AuthService.getInstance();
      let isAuthenticated = false;
      let authError: string | null = null;
      let userToken: string | null = null;
      let userId: string | null = null;

      try {
        isAuthenticated = await authService.initializeUser();
        userToken = await authService.getToken();
        userId = await authService.getUserId();

        if (!isAuthenticated) {
          authError = 'Authentication failed';
          console.warn('⚠️ Anonymous user initialization failed');
        } else {
          console.log('✅ Anonymous user initialized successfully', { userId });
        }
      } catch (error) {
        authError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Anonymous user initialization error:', error);
      }

      if (isAuthenticated && userId) {
        try {
          const storedLocale = await userDbService.getUserLocale(userId);
          if (storedLocale && storedLocale !== resolvedLocale) {
            await changeLanguage(storedLocale);
            resolvedLocale = storedLocale;
            console.log('🌐 Locale restored from user settings:', storedLocale);
          } else if (!storedLocale) {
            await userDbService.setUserLocale(userId, resolvedLocale);
            console.log('💾 Locale preference seeded for user:', resolvedLocale);
          }
        } catch (error) {
          const syncError = error instanceof Error ? error.message : 'Failed to sync locale preference';
          console.error('❌ Failed to sync user locale preference:', error);
          localeError = localeError ?? syncError;
        }
      }

      const initializationErrors: string[] = [];
      if (localeError) {
        initializationErrors.push(`Locale: ${localeError}`);
      }
      if (aiServiceError) {
        initializationErrors.push(`AI service: ${aiServiceError}`);
      }
      if (authError) {
        initializationErrors.push(`Auth: ${authError}`);
      }

      setState(prev => ({
        ...prev,
        locale: resolvedLocale,
        isLocaleLoading: false,
        localeError,
        isDatabaseInitialized: true,
        isInitializingDatabase: false,
        databaseError: null,
        isAIServiceAvailable,
        isCheckingAIService: false,
        aiServiceError,
        isAuthenticated,
        isAuthenticating: false,
        authError,
        userToken,
        userId,
        isAppInitialized: true,
        initializationError: initializationErrors.length ? initializationErrors.join('; ') : null,
      }));

      console.log('🎉 App initialization completed', {
        database: '✅',
        aiService: isAIServiceAvailable ? '✅' : '⚠️',
        auth: isAuthenticated ? '✅' : '⚠️',
      });
    } catch (error) {
      console.error('❌ App initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        locale: resolvedLocale,
        isLocaleLoading: false,
        localeError: localeError ?? errorMessage,
        isDatabaseInitialized: false,
        isInitializingDatabase: false,
        databaseError: errorMessage,
        isAIServiceAvailable: false,
        isCheckingAIService: false,
        aiServiceError: errorMessage,
        isAuthenticated: false,
        isAuthenticating: false,
        authError: errorMessage,
        userToken: null,
        userId: null,
        isAppInitialized: true,
        initializationError: errorMessage,
      }));
    }
  };

  const refreshAIServiceStatus = async () => {
    console.log('🔄 Refreshing AI service status...');
    setState(prev => ({ ...prev, isCheckingAIService: true }));

    try {
      const aiService = AIReadingService.getInstance();
      const isAIHealthy = await aiService.checkServiceHealth();

      setState(prev => ({
        ...prev,
        isAIServiceAvailable: isAIHealthy,
        isCheckingAIService: false,
        aiServiceError: isAIHealthy ? null : 'AI service is unavailable',
      }));

      console.log('✅ AI service status refreshed:', isAIHealthy);
    } catch (error) {
      console.error('❌ Failed to refresh AI service status:', error);
      setState(prev => ({
        ...prev,
        isAIServiceAvailable: false,
        isCheckingAIService: false,
        aiServiceError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const refreshAuthStatus = async () => {
    console.log('🔄 Refreshing auth status...');
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const authService = AuthService.getInstance();
      const authSuccess = await authService.initializeUser();
      const token = await authService.getToken();

      setState(prev => ({
        ...prev,
        isAuthenticated: authSuccess,
        isAuthenticating: false,
        authError: authSuccess ? null : 'Authentication failed',
        userToken: token,
      }));

      console.log('✅ Auth status refreshed:', authSuccess);
    } catch (error) {
      console.error('❌ Failed to refresh auth status:', error);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isAuthenticating: false,
        authError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const setLocale = async (locale: AppLocale) => {
    if (state.locale === locale) {
      return;
    }

    console.log('🌐 Switching locale to:', locale);
    setState(prev => ({
      ...prev,
      isLocaleLoading: true,
      localeError: null,
    }));

  try {
      await changeLanguage(locale);
      const currentUserId = state.userId;
      if (currentUserId) {
        try {
          const userDb = UserDatabaseService.getInstance();
          await userDb.setUserLocale(currentUserId, locale);
        } catch (dbError) {
          console.error('⚠️ Failed to persist locale preference:', dbError);
        }
      }
      setState(prev => ({
        ...prev,
        locale,
        isLocaleLoading: false,
        localeError: null,
      }));
      console.log('✅ Locale switched to:', locale);
    } catch (error) {
      console.error('❌ Failed to change locale:', error);
      const message = error instanceof Error ? error.message : 'Failed to change language';
      setState(prev => ({
        ...prev,
        isLocaleLoading: false,
        localeError: message,
      }));
    }
  };

  const contextValue: AppContextType = {
    state,
    actions: {
      initializeApp,
      refreshAIServiceStatus,
      refreshAuthStatus,
      setLocale,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>
      {hasBootstrapCompleted ? children : (
        <View style={styles.bootstrapContainer}>
          <ActivityIndicator size="small" color="#FFD700" />
        </View>
      )}
    </AppContext.Provider>
  );
};

export default AppContext;

const styles = StyleSheet.create({
  bootstrapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0F1A',
  },
});
