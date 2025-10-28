import { b as createAstro, c as createComponent, a as renderTemplate, d as renderScript, r as renderComponent, e as renderSlot, f as renderHead, g as addAttribute } from './astro/server_bED4jumr.mjs';
import { a as $$Footer, b as $$SEO, e as en } from './footer_CgJVMux7.mjs';
/* empty css                        */
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import React, { createContext, useState, useRef, useCallback, useEffect, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { sha256 } from 'js-sha256';
import { lemonSqueezySetup, getSubscription, cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const supabaseUrl = "https://fsmgroeytsburlgmoxcj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzUwMjQsImV4cCI6MjA3MzUxMTAyNH0.z6T4B5HtUuLoQD-hmSNJEWCmoXCM0_pNoy5MlaC49ok";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure authentication options
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // 修复生产环境会话存储问题
    storage: typeof window !== "undefined" ? window.localStorage : void 0,
    storageKey: "supabase.auth.token",
    // 添加生产环境兼容性配置
    flowType: "pkce",
    debug: false
  },
  // Configure realtime subscriptions (if needed)
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // 添加全局配置
  global: {
    headers: {
      "X-Client-Info": "describe-music-web"
    }
  }
});

let cachedFingerprint = null;
let fingerprintPromise = null;
class DeviceFingerprint {
  static CACHE_KEY = "device_fingerprint_cache";
  static CACHE_EXPIRY_KEY = "device_fingerprint_expiry";
  static CACHE_DURATION = 24 * 60 * 60 * 1e3;
  // 24小时
  /**
   * 生成设备指纹
   * 使用多种浏览器特征创建唯一标识
   */
  static async generate() {
    if (cachedFingerprint) {
      return cachedFingerprint;
    }
    if (fingerprintPromise) {
      return fingerprintPromise;
    }
    const cached = this.getCachedFingerprint();
    if (cached) {
      cachedFingerprint = cached;
      return cached;
    }
    fingerprintPromise = this.generateFingerprint();
    try {
      const fingerprint = await fingerprintPromise;
      cachedFingerprint = fingerprint;
      this.setCachedFingerprint(fingerprint);
      return fingerprint;
    } finally {
      fingerprintPromise = null;
    }
  }
  /**
   * 生成设备指纹的核心逻辑
   */
  static async generateFingerprint() {
    const components = {
      screen: this.getScreenFingerprint(),
      timezone: this.getTimezoneFingerprint(),
      language: this.getLanguageFingerprint(),
      platform: this.getPlatformFingerprint(),
      canvas: await this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      audio: await this.getAudioFingerprint(),
      userAgent: this.getUserAgentFingerprint()
    };
    const fingerprintString = Object.values(components).join("|");
    const salt = "describe-music-salt-2025-x9k2m8n4p7q1";
    const saltedFingerprint = `${fingerprintString}|${salt}`;
    return sha256(saltedFingerprint);
  }
  /**
   * 获取屏幕特征
   */
  static getScreenFingerprint() {
    if (typeof window === "undefined") return "server";
    const screen = window.screen;
    return [
      screen.width,
      screen.height,
      screen.colorDepth,
      screen.pixelDepth,
      window.devicePixelRatio || 1
    ].join("x");
  }
  /**
   * 获取时区特征
   */
  static getTimezoneFingerprint() {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
      return `${timezone}:${offset}`;
    } catch {
      return "unknown";
    }
  }
  /**
   * 获取语言特征
   */
  static getLanguageFingerprint() {
    if (typeof navigator === "undefined") return "server";
    return [
      navigator.language,
      navigator.languages?.slice(0, 3).join(",") || ""
    ].join("|");
  }
  /**
   * 获取平台特征
   */
  static getPlatformFingerprint() {
    if (typeof navigator === "undefined") return "server";
    return [
      navigator.platform,
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0
    ].join("|");
  }
  /**
   * 获取Canvas指纹
   */
  static async getCanvasFingerprint() {
    if (typeof window === "undefined") return "server";
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return "no-canvas";
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Device Fingerprint 🎵", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Audio Analysis", 4, 35);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgb(255,0,255)";
      ctx.beginPath();
      ctx.arc(50, 25, 20, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      const dataURL = canvas.toDataURL();
      return sha256(dataURL).substring(0, 16);
    } catch {
      return "canvas-error";
    }
  }
  /**
   * 获取WebGL指纹
   */
  static getWebGLFingerprint() {
    if (typeof window === "undefined") return "server";
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return "no-webgl";
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "";
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
      return sha256(`${vendor}|${renderer}`).substring(0, 16);
    } catch {
      return "webgl-error";
    }
  }
  /**
   * 获取音频上下文指纹
   */
  static async getAudioFingerprint() {
    if (typeof window === "undefined") return "server";
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return "no-audio";
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1e4, context.currentTime);
      gainNode.gain.setValueAtTime(0, context.currentTime);
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(0);
      const audioData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(audioData);
      oscillator.stop();
      context.close();
      const sum = audioData.reduce((acc, val) => acc + Math.abs(val), 0);
      return sha256(sum.toString()).substring(0, 16);
    } catch {
      return "audio-error";
    }
  }
  /**
   * 获取用户代理特征（部分信息）
   */
  static getUserAgentFingerprint() {
    if (typeof navigator === "undefined") return "server";
    const ua = navigator.userAgent;
    const parts = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/g) || [];
    return sha256(parts.join("|")).substring(0, 16);
  }
  /**
   * 从本地存储获取缓存的指纹
   */
  static getCachedFingerprint() {
    if (typeof localStorage === "undefined") return null;
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);
      if (!cached || !expiry) return null;
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() > expiryTime) {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_EXPIRY_KEY);
        return null;
      }
      return cached;
    } catch {
      return null;
    }
  }
  /**
   * 将指纹保存到本地存储
   */
  static setCachedFingerprint(fingerprint) {
    if (typeof localStorage === "undefined") return;
    try {
      const expiry = Date.now() + this.CACHE_DURATION;
      localStorage.setItem(this.CACHE_KEY, fingerprint);
      localStorage.setItem(this.CACHE_EXPIRY_KEY, expiry.toString());
    } catch {
    }
  }
  /**
   * 清除缓存的指纹
   */
  static clearCache() {
    cachedFingerprint = null;
    fingerprintPromise = null;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_EXPIRY_KEY);
      } catch {
      }
    }
  }
  /**
   * 获取设备的试用使用情况
   */
  static async getTrialUsage(fingerprint) {
    try {
      const deviceFingerprint = fingerprint || await this.generate();
      const { data, error } = await supabase.rpc("check_device_fingerprint_usage", {
        fingerprint_hash_param: deviceFingerprint
      });
      if (error) {
        console.error("Error checking device usage:", error);
        return {
          canAnalyze: true,
          remainingTrials: 5,
          isRegistered: false
        };
      }
      const result = data?.[0];
      return {
        canAnalyze: result?.can_analyze ?? true,
        remainingTrials: result?.remaining_trials ?? 5,
        isRegistered: result?.is_registered ?? false
      };
    } catch (error) {
      console.error("Error getting trial usage:", error);
      return {
        canAnalyze: true,
        remainingTrials: 5,
        isRegistered: false
      };
    }
  }
  /**
   * 更新设备的试用使用次数
   */
  static async updateTrialUsage(fingerprint) {
    try {
      const deviceFingerprint = fingerprint || await this.generate();
      /* @__PURE__ */ console.log("Trial usage will be updated by cloud function for:", deviceFingerprint);
    } catch (error) {
      console.error("Error updating trial usage:", error);
    }
  }
  /**
   * 清除设备的试用数据（注册时调用）
   */
  static async clearTrialData(fingerprint) {
    try {
      const deviceFingerprint = fingerprint || await this.generate();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        /* @__PURE__ */ console.warn("No authenticated user to associate device fingerprint");
        return;
      }
      const { data, error } = await supabase.rpc("associate_device_fingerprint_to_user", {
        fingerprint_hash_param: deviceFingerprint,
        user_uuid: user.id
      });
      if (error) {
        console.error("Error associating device fingerprint to user:", error);
      } else {
        /* @__PURE__ */ console.log("Device fingerprint associated to user successfully");
      }
    } catch (error) {
      console.error("Error clearing trial data:", error);
    }
  }
  /**
   * 关联设备指纹到用户账户
   */
  static async associateWithUser(userId, fingerprint) {
    try {
      const deviceFingerprint = fingerprint || await this.generate();
      const { data, error } = await supabase.rpc("associate_device_fingerprint_to_user", {
        fingerprint_hash_param: deviceFingerprint,
        user_uuid: userId
      });
      if (error) {
        console.error("Error associating device fingerprint:", error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error("Error in associateWithUser:", error);
      return false;
    }
  }
  /**
   * 验证设备指纹的有效性
   */
  static validateFingerprint(fingerprint) {
    return /^[a-f0-9]{64}$/i.test(fingerprint);
  }
  /**
   * 获取设备信息摘要（用于调试）
   */
  static async getDeviceInfo() {
    if (typeof window === "undefined") {
      return { environment: "server" };
    }
    return {
      screen: this.getScreenFingerprint(),
      timezone: this.getTimezoneFingerprint(),
      language: this.getLanguageFingerprint(),
      platform: this.getPlatformFingerprint(),
      userAgent: navigator.userAgent.substring(0, 100) + "...",
      // 截断用户代理
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}

const AuthContext = createContext(void 0);
function AuthProvider({ children }) {
  React.useEffect(() => {
    return () => {
    };
  }, []);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageStatus, setUsageStatus] = useState(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  const subscriptionRef = useRef(null);
  const initializedRef = useRef(false);
  const getDeviceFingerprint = useCallback(async () => {
    if (deviceFingerprint) {
      return deviceFingerprint;
    }
    try {
      const fingerprint = await DeviceFingerprint.generate();
      setDeviceFingerprint(fingerprint);
      return fingerprint;
    } catch (error) {
      console.error("Error generating device fingerprint:", error);
      const fallbackFingerprint = `fallback_${Date.now()}_${Math.random()}`;
      setDeviceFingerprint(fallbackFingerprint);
      return fallbackFingerprint;
    }
  }, [deviceFingerprint]);
  const checkUsageLimit = useCallback(async () => {
    if (user) {
      return {
        allowed: true,
        remaining: 999,
        total: 999,
        requiresAuth: false,
        userType: "registered",
        message: "已登录用户 - 无限制使用"
      };
    } else {
      return {
        allowed: true,
        remaining: 100,
        total: 100,
        requiresAuth: false,
        userType: "trial",
        message: "Trial Mode - 100 Credits"
      };
    }
  }, [user]);
  const consumeUsage = useCallback(async () => {
  }, []);
  const refreshUsageStatus = useCallback(async () => {
    try {
      const status = await checkUsageLimit();
      setUsageStatus(status);
    } catch (error) {
      console.error("Error refreshing usage status:", error);
    }
  }, [checkUsageLimit]);
  const signUp = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            registered_at: (/* @__PURE__ */ new Date()).toISOString()
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/analyze` : void 0
        }
      });
      if (error) {
        return { data: { user: null, session: null }, error };
      }
      if (data.user) {
        /* @__PURE__ */ console.log("🔐 User registered successfully:", data.user.email);
        /* @__PURE__ */ console.log("🔐 Email confirmation required - user will need to check email");
      }
      return { data, error: null };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error
      };
    } finally {
    }
  }, []);
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        return { data: { user: null, session: null }, error };
      }
      if (data.session && data.user) {
        /* @__PURE__ */ console.log("🔐 Login successful, updating state immediately");
        setSession(data.session);
        setUser(data.user);
        setUsageStatus({
          allowed: true,
          remaining: 999,
          total: 999,
          requiresAuth: false,
          userType: "registered",
          message: "Registered user"
        });
      }
      return { data, error: null };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error
      };
    } finally {
      setLoading(false);
    }
  }, []);
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/analyze` : void 0,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });
      if (error) {
        return { data: { user: null, session: null }, error };
      }
      /* @__PURE__ */ console.log("🔐 Google OAuth initiated, redirecting...");
      return { data, error: null };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error
      };
    } finally {
      setLoading(false);
    }
  }, []);
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      /* @__PURE__ */ console.log("🔐 Clearing local state before signOut");
      setSession(null);
      setUser(null);
      setUsageStatus({
        allowed: true,
        remaining: 100,
        total: 100,
        requiresAuth: false,
        userType: "trial",
        message: "Trial mode"
      });
      try {
        const { error } = await supabase.auth.signOut();
        if (error && error.message !== "Auth session missing!") {
          /* @__PURE__ */ console.warn("🔐 SignOut warning:", error.message);
        }
      } catch (signOutError) {
        if (signOutError.message !== "Auth session missing!") {
          /* @__PURE__ */ console.warn("🔐 SignOut error (non-critical):", signOutError.message);
        }
      }
      /* @__PURE__ */ console.log("🔐 Logout completed, state cleared");
    } catch (error) {
      console.error("🔐 Critical error in signOut:", error);
      setSession(null);
      setUser(null);
      setUsageStatus({
        allowed: true,
        remaining: 100,
        total: 100,
        requiresAuth: false,
        userType: "trial",
        message: "Trial mode"
      });
    } finally {
      setLoading(false);
    }
  }, []);
  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/analyze?reset=true`
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  }, []);
  const clearDeviceCache = useCallback(() => {
    DeviceFingerprint.clearCache();
    setDeviceFingerprint(null);
  }, []);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let mounted = true;
    const initializeAuth = async () => {
      try {
        /* @__PURE__ */ console.log("🔐 Getting initial session...");
        const { data: { session: session2 }, error } = await supabase.auth.getSession();
        /* @__PURE__ */ console.log("🔐 Session check result:", {
          hasSession: !!session2,
          userEmail: session2?.user?.email,
          error: error?.message,
          expiresAt: session2?.expires_at ? new Date(session2.expires_at * 1e3) : null,
          isExpired: session2?.expires_at ? session2.expires_at * 1e3 < Date.now() : null
        });
        if (error) {
          console.error("🔐 Session error:", error);
        } else {
          /* @__PURE__ */ console.log("🔐 Initial session:", session2?.user?.email || "no session");
        }
        if (mounted) {
          /* @__PURE__ */ console.log("🔐 Updating state with session data...");
          setSession(session2);
          setUser(session2?.user ?? null);
          const initialStatus = {
            allowed: true,
            remaining: session2 ? 999 : 100,
            total: session2 ? 999 : 100,
            requiresAuth: false,
            userType: session2 ? "registered" : "trial",
            message: session2 ? "Registered user" : "Trial mode"
          };
          setUsageStatus(initialStatus);
          /* @__PURE__ */ console.log("🔐 State updated - user:", session2?.user?.email || "no user");
          /* @__PURE__ */ console.log("🔐 Setting loading to false");
          setLoading(false);
          if (session2?.user) {
            /* @__PURE__ */ console.log("🔐 ✅ User session restored:", session2.user.email);
            if (session2.expires_at && session2.expires_at * 1e3 - Date.now() < 6e4) {
              /* @__PURE__ */ console.log("🔐 Token expiring soon, refreshing...");
              supabase.auth.refreshSession();
            }
          } else {
            /* @__PURE__ */ console.log("🔐 ❌ No existing session found");
          }
        } else {
          /* @__PURE__ */ console.log("🔐 Component unmounted, skipping state update");
        }
        if (!subscriptionRef.current && mounted) {
          /* @__PURE__ */ console.log("🔐 Setting up auth state listener (one time only)");
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session3) => {
              if (!mounted) return;
              /* @__PURE__ */ console.log("🔐 Auth event:", event, session3?.user?.email || "no user");
              /* @__PURE__ */ console.log("🔐 Auth event details:", {
                event,
                hasSession: !!session3,
                hasUser: !!session3?.user,
                emailConfirmed: session3?.user?.email_confirmed_at
              });
              if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                if (session3 && session3.user) {
                  /* @__PURE__ */ console.log("🔐 Updating session for event:", event);
                  setSession(session3);
                  setUser(session3.user);
                  setUsageStatus({
                    allowed: true,
                    remaining: 999,
                    total: 999,
                    requiresAuth: false,
                    userType: "registered",
                    message: "Registered user"
                  });
                }
              } else if (event === "SIGNED_OUT") {
                /* @__PURE__ */ console.log("🔐 Clearing user session");
                setSession(null);
                setUser(null);
                setUsageStatus({
                  allowed: true,
                  remaining: 100,
                  total: 100,
                  requiresAuth: false,
                  userType: "trial",
                  message: "Trial mode"
                });
              }
            }
          );
          subscriptionRef.current = subscription;
        }
      } catch (error) {
        console.error("🔐 Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    initializeAuth();
    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);
  /* @__PURE__ */ console.log("🔍 AuthContext - user:", user?.email || "no user");
  const value = {
    user,
    session,
    loading,
    usageStatus,
    deviceFingerprint,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    checkUsageLimit,
    consumeUsage,
    refreshUsageStatus,
    getDeviceFingerprint,
    clearDeviceCache
  };
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
}
function useAuth() {
  const context = useContext(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

class CreditCalculator {
  static CREDITS_PER_SECOND = 1;
  static MIN_CREDITS_WARNING = 100;
  // Low credit warning threshold
  /**
   * Calculate credit consumption (rounded up to seconds)
   * @param durationSeconds Audio duration in seconds
   * @returns Required credit amount
   */
  static calculateCreditsForDuration(durationSeconds) {
    if (durationSeconds <= 0) {
      return 0;
    }
    const roundedSeconds = Math.ceil(durationSeconds);
    return roundedSeconds * this.CREDITS_PER_SECOND;
  }
  /**
   * Check if credit balance is sufficient
   * @param currentBalance Current credit balance
   * @param requiredCredits Required credits
   * @returns Balance check result
   */
  static checkBalance(currentBalance, requiredCredits) {
    if (requiredCredits <= 0) {
      return {
        isValid: true
      };
    }
    if (currentBalance >= requiredCredits) {
      const balanceAfter = currentBalance - requiredCredits;
      if (balanceAfter < this.MIN_CREDITS_WARNING) {
        return {
          isValid: true,
          suggestion: `After analysis, your credit balance will drop to ${balanceAfter}. Consider purchasing more credits for continued use.`
        };
      }
      return {
        isValid: true
      };
    }
    const shortfall = requiredCredits - currentBalance;
    return {
      isValid: false,
      error: `Insufficient credit balance. Need ${shortfall} more credits to complete this analysis.`,
      suggestion: "Please purchase a credit package or wait for next month's credit reset."
    };
  }
  /**
   * Generate credit consumption estimate
   * @param durationSeconds Audio duration
   * @param currentBalance Current credit balance
   * @returns Consumption estimate information
   */
  static estimateConsumption(durationSeconds, currentBalance) {
    const creditsRequired = this.calculateCreditsForDuration(durationSeconds);
    const canAfford = currentBalance >= creditsRequired;
    const shortfall = canAfford ? 0 : creditsRequired - currentBalance;
    const balanceAfter = Math.max(0, currentBalance - creditsRequired);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    let durationText = "";
    if (minutes > 0) {
      durationText = `${minutes}m ${seconds}s`;
    } else {
      durationText = `${seconds}s`;
    }
    const estimatedCost = `${durationText} = ${creditsRequired} credits`;
    return {
      creditsRequired,
      canAfford,
      shortfall,
      estimatedCost,
      balanceAfter
    };
  }
  /**
   * Format credit amount display
   * @param credits Credit amount
   * @returns Formatted credit display
   */
  static formatCreditsDisplay(credits) {
    if (credits < 0) {
      return "0";
    }
    if (credits >= 1e4) {
      const k = Math.floor(credits / 1e3);
      const remainder = credits % 1e3;
      if (remainder === 0) {
        return `${k}k`;
      } else {
        return `${k}.${Math.floor(remainder / 100)}k`;
      }
    }
    return `${credits.toLocaleString()}`;
  }
  /**
   * Format credit balance details
   * @param balance Credit balance details
   * @returns Formatted balance display
   */
  static formatBalanceDetails(balance) {
    const parts = [];
    if (balance.trial > 0) {
      parts.push(`Trial: ${balance.trial}`);
    }
    if (balance.monthly > 0) {
      parts.push(`Monthly: ${balance.monthly}`);
    }
    if (balance.purchased > 0) {
      parts.push(`Purchased: ${balance.purchased}`);
    }
    if (parts.length === 0) {
      return "No available credits";
    }
    return parts.join(" | ");
  }
  /**
   * Calculate recommended purchase plan
   * @param shortfall Insufficient credit amount
   * @returns Recommended plan information
   */
  static recommendPlan(shortfall) {
    const plans = [
      { id: "basic", name: "Basic Plan", credits: 1200, price: 9.9 },
      { id: "pro", name: "Professional Plan", credits: 3e3, price: 19.9 },
      { id: "premium", name: "Premium Plan", credits: 7200, price: 39.9 }
    ];
    const suitablePlan = plans.find((plan) => plan.credits >= shortfall);
    if (!suitablePlan) {
      const premiumPlan = plans[plans.length - 1];
      return {
        ...premiumPlan,
        planId: premiumPlan.id,
        planName: premiumPlan.name,
        savings: 0
      };
    }
    const savings = suitablePlan.credits - shortfall;
    return {
      ...suitablePlan,
      planId: suitablePlan.id,
      planName: suitablePlan.name,
      savings
    };
  }
  /**
   * Validate credit amount validity
   * @param credits Credit amount
   * @returns Validation result
   */
  static validateCreditsAmount(credits) {
    if (!Number.isInteger(credits)) {
      return {
        isValid: false,
        error: "Credit amount must be an integer"
      };
    }
    if (credits < 0) {
      return {
        isValid: false,
        error: "Credit amount cannot be negative"
      };
    }
    if (credits > 1e6) {
      return {
        isValid: false,
        error: "Credit amount is too large"
      };
    }
    return {
      isValid: true
    };
  }
  /**
   * Calculate monthly credit reset information
   * @param lastResetDate Last reset date
   * @param monthlyCredits Monthly credit amount
   * @returns Reset information
   */
  static calculateMonthlyReset(lastResetDate, monthlyCredits = 200) {
    const now = /* @__PURE__ */ new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastResetMonth = lastResetDate.getMonth();
    const lastResetYear = lastResetDate.getFullYear();
    const shouldReset = currentYear > lastResetYear || currentYear === lastResetYear && currentMonth > lastResetMonth;
    const nextResetDate = new Date(currentYear, currentMonth + 1, 1);
    const timeDiff = nextResetDate.getTime() - now.getTime();
    const daysUntilReset = Math.ceil(timeDiff / (1e3 * 60 * 60 * 24));
    return {
      shouldReset,
      daysUntilReset,
      nextResetDate
    };
  }
  /**
   * Generate credit usage suggestions
   * @param currentBalance Current balance
   * @param averageConsumption Average consumption (optional)
   * @returns Usage suggestions
   */
  static generateUsageSuggestion(currentBalance, averageConsumption) {
    if (currentBalance <= 0) {
      return "Your credits have been exhausted. Please purchase a credit package to continue using the service.";
    }
    if (currentBalance < this.MIN_CREDITS_WARNING) {
      return "Your credit balance is low. Consider purchasing more credits to ensure uninterrupted service.";
    }
    if (averageConsumption && averageConsumption > 0) {
      const estimatedDays = Math.floor(currentBalance / averageConsumption);
      if (estimatedDays < 7) {
        return `Based on your average usage, current credits will last approximately ${estimatedDays} days. Consider purchasing more credits in advance.`;
      } else if (estimatedDays < 30) {
        return `Based on your average usage, current credits will last approximately ${estimatedDays} days.`;
      }
    }
    return "Your credit balance is sufficient for normal service usage.";
  }
}

const CreditContext = createContext(void 0);
function CreditProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [credits, setCredits] = useState(0);
  const [creditBalance, setCreditBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const checkCredits = useCallback(async () => {
    if (!user) {
      return 0;
    }
    try {
      /* @__PURE__ */ console.log("💳 Checking credits for user:", user.email);
      setError(null);
      const { data, error: error2 } = await supabase.rpc("get_user_credit_details", {
        user_uuid: user.id
      });
      if (error2) {
        console.error("💳 Error checking credits:", error2);
        if (error2.code === "PGRST116" || error2.message?.includes("no rows")) {
          /* @__PURE__ */ console.log("💳 No credit record found, creating default...");
          await createDefaultCreditRecord(user);
          return 200;
        }
        throw error2;
      }
      const result = data?.[0];
      if (result) {
        const totalCredits = result.total_credits || 0;
        const balance = {
          total: totalCredits,
          trial: result.trial_credits || 0,
          monthly: result.monthly_credits || 0,
          purchased: result.purchased_credits || 0
        };
        setCredits(totalCredits);
        setCreditBalance(balance);
        /* @__PURE__ */ console.log("💳 State updated - credits:", totalCredits, "balance:", balance);
        if (result.subscription_status && result.subscription_expires_at) {
          setSubscription({
            id: "current",
            // Placeholder
            status: result.subscription_status,
            planId: "unknown",
            planName: "Current Plan",
            credits: 0,
            // Will be updated when we have plan details
            currentPeriodStart: /* @__PURE__ */ new Date(),
            currentPeriodEnd: new Date(result.subscription_expires_at),
            cancelAtPeriodEnd: false
          });
        } else {
          setSubscription(null);
        }
        /* @__PURE__ */ console.log("💳 Credits updated:", totalCredits, balance);
        return totalCredits;
      } else {
        /* @__PURE__ */ console.log("💳 No credit record found, creating default...");
        await createDefaultCreditRecord(user);
        return 200;
      }
    } catch (error2) {
      console.error("💳 Error in checkCredits:", error2);
      setError("Failed to check credits");
      return 0;
    }
  }, [user]);
  const createDefaultCreditRecord = useCallback(async (user2) => {
    try {
      /* @__PURE__ */ console.log("💳 Creating default credit record for user:", user2.email);
      const { error: error2 } = await supabase.rpc("add_credits", {
        user_uuid: user2.id,
        credits_amount: 200,
        credit_source: "monthly_grant",
        description: "Initial monthly credit grant for new user"
      });
      if (error2) {
        console.error("💳 Error creating default credit record:", error2);
        throw error2;
      }
      setCredits(200);
      setCreditBalance({
        total: 200,
        trial: 0,
        monthly: 200,
        purchased: 0
      });
      /* @__PURE__ */ console.log("💳 Default credit record created successfully");
    } catch (error2) {
      console.error("💳 Error in createDefaultCreditRecord:", error2);
      throw error2;
    }
  }, []);
  const consumeCredits = useCallback(async (amount, description, analysisId) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    if (amount <= 0) {
      throw new Error("Credit amount must be positive");
    }
    if (credits < amount) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${credits}`);
    }
    try {
      /* @__PURE__ */ console.log("💳 Consuming credits:", amount, "for:", description);
      setError(null);
      const { data, error: error2 } = await supabase.rpc("consume_credits", {
        user_uuid: user.id,
        credits_amount: amount,
        analysis_description: description,
        analysis_id: analysisId || null
      });
      if (error2) {
        console.error("💳 Error consuming credits:", error2);
        throw new Error(`Failed to consume credits: ${error2.message}`);
      }
      if (!data) {
        throw new Error("Insufficient credits or consumption failed");
      }
      await checkCredits();
      /* @__PURE__ */ console.log("💳 Credits consumed successfully");
    } catch (error2) {
      console.error("💳 Error in consumeCredits:", error2);
      setError(error2 instanceof Error ? error2.message : "Failed to consume credits");
      throw error2;
    }
  }, [user, credits, checkCredits]);
  const addCredits = useCallback(async (amount, source, description) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    if (amount <= 0) {
      throw new Error("Credit amount must be positive");
    }
    const validSources = ["purchase", "monthly_grant", "trial_grant", "refund", "bonus"];
    if (!validSources.includes(source)) {
      throw new Error(`Invalid credit source: ${source}`);
    }
    try {
      /* @__PURE__ */ console.log("💳 Adding credits:", amount, "from:", source);
      setError(null);
      const { data, error: error2 } = await supabase.rpc("add_credits", {
        user_uuid: user.id,
        credits_amount: amount,
        credit_source: source,
        description: description || null
      });
      if (error2) {
        console.error("💳 Error adding credits:", error2);
        throw new Error(`Failed to add credits: ${error2.message}`);
      }
      if (!data) {
        throw new Error("Failed to add credits - database operation returned false");
      }
      await checkCredits();
      /* @__PURE__ */ console.log("💳 Credits added successfully");
    } catch (error2) {
      console.error("💳 Error in addCredits:", error2);
      setError(error2 instanceof Error ? error2.message : "Failed to add credits");
      throw error2;
    }
  }, [user, checkCredits]);
  const refundCredits = useCallback(async (amount, reason, originalAnalysisId) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    if (amount <= 0) {
      throw new Error("Refund amount must be positive");
    }
    try {
      /* @__PURE__ */ console.log("💳 Refunding credits:", amount, "reason:", reason);
      setError(null);
      const { data, error: error2 } = await supabase.rpc("refund_credits", {
        user_uuid: user.id,
        credits_amount: amount,
        refund_reason: reason,
        original_analysis_id: originalAnalysisId || null
      });
      if (error2) {
        console.error("💳 Error refunding credits:", error2);
        throw new Error(`Failed to refund credits: ${error2.message}`);
      }
      if (!data) {
        throw new Error("Failed to refund credits - database operation returned false");
      }
      await checkCredits();
      /* @__PURE__ */ console.log("💳 Credits refunded successfully");
    } catch (error2) {
      console.error("💳 Error in refundCredits:", error2);
      setError(error2 instanceof Error ? error2.message : "Failed to refund credits");
      throw error2;
    }
  }, [user, checkCredits]);
  const refreshCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (user) {
        /* @__PURE__ */ console.log("💳 Refreshing credits for user:", user.email);
        const newCredits = await checkCredits();
        /* @__PURE__ */ console.log("💳 Credits refreshed to:", newCredits);
      } else {
        setCredits(0);
        setCreditBalance(null);
        setSubscription(null);
      }
    } catch (error2) {
      console.error("💳 Error refreshing credits:", error2);
      setError("Failed to refresh credits");
    } finally {
      setLoading(false);
    }
  }, [user, checkCredits]);
  const calculateCreditsForDuration = useCallback((durationSeconds) => {
    return CreditCalculator.calculateCreditsForDuration(durationSeconds);
  }, []);
  const estimateConsumption = useCallback((durationSeconds) => {
    return CreditCalculator.estimateConsumption(durationSeconds, credits);
  }, [credits]);
  const checkTrialCredits = useCallback(async (requiredCredits = 1) => {
    try {
      /* @__PURE__ */ console.log("💳 Checking trial credits, required:", requiredCredits);
      if (requiredCredits <= 0) {
        return true;
      }
      const fingerprint = await DeviceFingerprint.generate();
      const { data, error: error2 } = await supabase.rpc("check_trial_credits", {
        fingerprint_hash_param: fingerprint,
        required_credits: requiredCredits
      });
      if (error2) {
        console.error("💳 Error checking trial credits:", error2);
        return requiredCredits <= 100;
      }
      const canUse = data === true;
      /* @__PURE__ */ console.log("💳 Trial credits check result:", canUse);
      return canUse;
    } catch (error2) {
      console.error("💳 Error in checkTrialCredits:", error2);
      return requiredCredits <= 100;
    }
  }, []);
  const consumeTrialCredits = useCallback(async (amount, description, analysisId) => {
    if (amount <= 0) {
      throw new Error("Credit amount must be positive");
    }
    try {
      /* @__PURE__ */ console.log("💳 Consuming trial credits:", amount, "for:", description);
      const hasEnoughCredits = await checkTrialCredits(amount);
      if (!hasEnoughCredits) {
        throw new Error(`Insufficient trial credits. Required: ${amount} credits`);
      }
      const fingerprint = await DeviceFingerprint.generate();
      const { data, error: error2 } = await supabase.rpc("consume_trial_credits", {
        fingerprint_hash_param: fingerprint,
        credits_amount: amount,
        analysis_description: description,
        analysis_id: analysisId || null
      });
      if (error2) {
        console.error("💳 Error consuming trial credits:", error2);
        throw new Error(`Failed to consume trial credits: ${error2.message}`);
      }
      if (!data) {
        throw new Error("Insufficient trial credits or consumption failed");
      }
      /* @__PURE__ */ console.log("💳 Trial credits consumed successfully");
    } catch (error2) {
      console.error("💳 Error in consumeTrialCredits:", error2);
      throw error2;
    }
  }, [checkTrialCredits]);
  const refundTrialCredits = useCallback(async (amount, reason, originalAnalysisId) => {
    if (amount <= 0) {
      throw new Error("Refund amount must be positive");
    }
    try {
      /* @__PURE__ */ console.log("💳 Refunding trial credits:", amount, "reason:", reason);
      const fingerprint = await DeviceFingerprint.generate();
      const { data, error: error2 } = await supabase.rpc("refund_trial_credits", {
        fingerprint_hash_param: fingerprint,
        credits_amount: amount,
        refund_reason: reason,
        original_analysis_id: originalAnalysisId || null
      });
      if (error2) {
        console.error("💳 Error refunding trial credits:", error2);
        throw new Error(`Failed to refund trial credits: ${error2.message}`);
      }
      if (!data) {
        throw new Error("Failed to refund trial credits - database operation returned false");
      }
      /* @__PURE__ */ console.log("💳 Trial credits refunded successfully");
    } catch (error2) {
      console.error("💳 Error in refundTrialCredits:", error2);
      throw error2;
    }
  }, []);
  const getTrialCreditBalance = useCallback(async () => {
    try {
      /* @__PURE__ */ console.log("💳 Getting trial credit balance from database");
      const fingerprint = await DeviceFingerprint.generate();
      const { data, error: error2 } = await supabase.from("device_fingerprints").select("trial_credits, credits_used").eq("fingerprint_hash", fingerprint).is("deleted_at", null).is("user_id", null).single();
      if (error2) {
        if (error2.code === "PGRST116") {
          /* @__PURE__ */ console.log("💳 New device, no record found yet. Showing default balance.");
          return {
            total: 100,
            used: 0,
            remaining: 100
          };
        }
        throw error2;
      }
      const balance = {
        total: data.trial_credits || 100,
        used: data.credits_used || 0,
        remaining: (data.trial_credits || 100) - (data.credits_used || 0)
      };
      /* @__PURE__ */ console.log("💳 Trial credit balance from database:", balance);
      return balance;
    } catch (error2) {
      console.error("💳 Error getting trial credit balance:", error2);
      return {
        total: 100,
        used: 0,
        remaining: 100
      };
    }
  }, []);
  const migrateTrialCreditsToUser = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      /* @__PURE__ */ console.log("💳 Migrating trial credits to user account");
      const fingerprint = await DeviceFingerprint.generate();
      const trialBalance = await getTrialCreditBalance();
      if (trialBalance.remaining > 0) {
        await addCredits(
          trialBalance.remaining,
          "trial_grant",
          `Migrated ${trialBalance.remaining} trial credits from device fingerprint`
        );
        /* @__PURE__ */ console.log("💳 Migrated", trialBalance.remaining, "trial credits to user account");
        const migrationKey = `trial_used_${fingerprint}`;
        localStorage.setItem(migrationKey, "true");
      }
      await DeviceFingerprint.associateWithUser(user.id, fingerprint);
      /* @__PURE__ */ console.log("💳 Trial credit migration completed");
    } catch (error2) {
      console.error("💳 Error migrating trial credits:", error2);
    }
  }, [user, getTrialCreditBalance, addCredits]);
  const getSubscriptionStatus = useCallback(async () => {
    return subscription;
  }, [subscription]);
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        checkCredits().then((actualCredits) => {
        }).catch((error2) => {
          console.error("💳 Failed to initialize credits:", error2);
          setCredits(200);
          setCreditBalance({
            total: 200,
            trial: 0,
            monthly: 200,
            purchased: 0
          });
        }).finally(() => {
          setLoading(false);
        });
      } else {
        setCredits(0);
        setCreditBalance(null);
        setSubscription(null);
        setLoading(false);
      }
    }
  }, [user?.id, authLoading, checkCredits]);
  const value = {
    // Credit state
    credits,
    creditBalance,
    loading,
    error,
    // Subscription state
    subscription,
    // Credit methods
    checkCredits,
    consumeCredits,
    addCredits,
    refundCredits,
    refreshCredits,
    // Credit calculation methods
    calculateCreditsForDuration,
    estimateConsumption,
    // Trial credit methods
    checkTrialCredits,
    consumeTrialCredits,
    refundTrialCredits,
    getTrialCreditBalance,
    migrateTrialCreditsToUser,
    // Subscription methods
    getSubscriptionStatus
  };
  return /* @__PURE__ */ jsx(CreditContext.Provider, { value, children });
}
function useCredit() {
  const context = useContext(CreditContext);
  if (context === void 0) {
    throw new Error("useCredit must be used within a CreditProvider");
  }
  return context;
}
function useTrialCredit() {
  const {
    checkTrialCredits,
    consumeTrialCredits,
    refundTrialCredits,
    getTrialCreditBalance,
    calculateCreditsForDuration
  } = useCredit();
  return {
    checkTrialCredits,
    consumeTrialCredits,
    refundTrialCredits,
    getTrialCreditBalance,
    calculateCreditsForDuration
  };
}

const FREE_PLAN = {
  name: "Free Trial",
  credits: 100,
  // 100 credits for non-logged users
  creditsLoggedIn: 200,
  // 200 credits monthly for logged users (100 base + 100 bonus)
  description: "Free trial of AI audio analysis",
  features: [
    "Not logged in: 100 credits (1.7 minutes)",
    "Logged in: 200 credits monthly (3.3 minutes)",
    "Basic audio analysis features",
    "Supports MP3 format (max 10MB)",
    "View analysis results online",
    "Community support"
  ],
  limitations: [
    "No export functionality",
    "No batch processing support",
    "No API access",
    "MP3 format only",
    "10MB file size limit"
  ]};
const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "Basic Plan",
    price: 9.9,
    credits: 1200,
    // Monthly credits (20 minutes)
    variantId: "999961",
    description: "Perfect for light users",
    features: [
      "1200 credits monthly (20 minutes)",
      "PDF/TXT report export",
      "Supports MP3, WAV formats",
      "Max file size 50MB",
      "Advanced audio analysis",
      "Email customer support",
      "History record saving"
    ],
    audioFormats: ["MP3", "WAV"],
    maxFileSize: "50MB",
    exportFormats: ["PDF", "TXT"],
    hasExport: true,
    hasBatchProcessing: false,
    hasAPI: false,
    analysisLevel: "advanced",
    supportLevel: "email"
  },
  pro: {
    id: "pro",
    name: "Professional Plan",
    price: 19.9,
    credits: 3e3,
    // Monthly credits (50 minutes)
    variantId: "999967",
    description: "Perfect for professional users",
    popular: true,
    features: [
      "3000 credits monthly (50 minutes)",
      "Multi-format report export",
      "Supports all audio file formats",
      "Max file size 200MB",
      "Advanced audio analysis",
      "History record saving",
      "🚧 Batch processing feature (In Development)",
      "🚧 API access permissions (In Development)",
      "Email customer support"
    ],
    audioFormats: ["MP3", "WAV", "M4A", "OGG", "WMA"],
    maxFileSize: "200MB",
    exportFormats: ["PDF", "TXT", "CSV", "JSON"],
    hasExport: true,
    hasBatchProcessing: "coming_soon",
    hasAPI: "coming_soon",
    analysisLevel: "advanced",
    supportLevel: "email"
  },
  premium: {
    id: "premium",
    name: "Enterprise Plan",
    price: 39.9,
    credits: 7200,
    // Monthly credits (120 minutes)
    variantId: "999967",
    description: "Perfect for enterprises and heavy users",
    features: [
      "7200 credits monthly (120 minutes)",
      "Complete report suite export",
      "Supports all audio file formats",
      "Max file size 200MB",
      "Advanced audio analysis",
      "History record saving",
      "🚧 Batch processing feature (In Development)",
      "🚧 API access permissions (In Development)",
      "Email customer support"
    ],
    audioFormats: ["MP3", "WAV", "M4A", "OGG", "WMA"],
    maxFileSize: "200MB",
    exportFormats: ["PDF", "TXT", "CSV", "JSON"],
    hasExport: true,
    hasBatchProcessing: "coming_soon",
    hasAPI: "coming_soon",
    analysisLevel: "advanced",
    supportLevel: "email"
  }
};
class LemonsqueezyError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "LemonsqueezyError";
  }
}
class LemonsqueezyService {
  static instance;
  apiKey;
  storeId;
  isInitialized = false;
  constructor() {
    const envApiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJjZWY4MDU1Y2E2NzI4YjM3NzAxMTU5MzEwYzkzNmQ0YjA2OGI3OWQ1MDFkODNhYTAxYjAyN2I3N2RjYjkzYTBlNWVmMWM3YWMzZjA0ODBkYyIsImlhdCI6MTc1ODIxNDU0Ny43NTY3OTYsIm5iZiI6MTc1ODIxNDU0Ny43NTY3OTksImV4cCI6MjA3Mzc0NzM0Ny43NDM0NCwic3ViIjoiMTkxNDAxMSIsInNjb3BlcyI6W119.as4QEOlT0uK1bOQC8C464bjvdgH4Icsf0MZMLLps4L2aVPnnVdqInbQYQG-x_PGJwY2qPdugjm1zPorVEFDdyboqMJKWLshEA-j8mXbcZeSu91u05YKKT5vE1ekZTvDrvMN8QAtQNvJ6mZLqWlpasHDOdbZYHM9uwjSYa4-zRMYbjVvEHtB0tJtRF1U8NxlUGnRkGmqWLITx-b-xb5XNjF2Pe-Y85SJJhyU0Sf0K1nfjWvKNebzYoMfwuCHXUdEjVsJvLcrZwNuLRO47YOIGwXJISQa2mqAx2PqONNs37QKz4ACWy6mPSRaz59XhTZueIHz8rqMn5adAQ6oApaEMGvcVpToAGfZknIqKpm5nt0JakFTFCEfGfKDGskpsDDXIyyxaUhVRF87xXNkM7mP7PXRcW4BsJ3EM1H_nj7VzQ194JUFDISc-nQuIefQDnTIShYLKCaMbAfuo_J6GfHUYGrEO11ryljU5q95_Mj5M6ztdjuPDKHkUCURDd7d2rtpX";
    this.apiKey = envApiKey;
    this.storeId = "76046";
    if (!this.apiKey || !this.storeId) ;
  }
  /**
   * Get service instance (singleton pattern)
   */
  static getInstance() {
    if (!LemonsqueezyService.instance) {
      LemonsqueezyService.instance = new LemonsqueezyService();
    }
    return LemonsqueezyService.instance;
  }
  /**
   * Initialize Lemonsqueezy SDK
   */
  async initialize() {
    if (this.isInitialized) return;
    if (!this.apiKey) {
      throw new LemonsqueezyError(
        "Lemonsqueezy API key not configured",
        "MISSING_API_KEY"
      );
    }
    try {
      lemonSqueezySetup({
        apiKey: this.apiKey,
        onError: (error) => {
          console.error("Lemonsqueezy SDK Error:", error);
        }
      });
      this.isInitialized = true;
    } catch (error) {
      throw new LemonsqueezyError(
        "Failed to initialize Lemonsqueezy SDK",
        "INITIALIZATION_FAILED"
      );
    }
  }
  /**
   * Create payment checkout session
   */
  async createCheckout(planId, customData = {}) {
    await this.initialize();
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new LemonsqueezyError(
        `Invalid plan ID: ${planId}`,
        "INVALID_PLAN_ID"
      );
    }
    if (!plan.variantId) {
      throw new LemonsqueezyError(
        `Variant ID not configured for plan: ${planId}`,
        "MISSING_VARIANT_ID"
      );
    }
    try {
      const checkoutData = {
        data: {
          type: "checkouts",
          attributes: {
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
              desc: true,
              discount: true,
              dark: false,
              subscription_preview: true,
              button_color: "#3B82F6"
            },
            checkout_data: {
              email: customData.userEmail || "",
              name: customData.userName || "",
              custom: {
                user_id: customData.userId || "",
                plan_id: planId,
                credits: plan.credits.toString(),
                ...customData
              }
            },
            product_options: {
              name: plan.name,
              description: `${plan.description} - ${plan.credits} credits`,
              media: [],
              redirect_url: `${window.location.origin}/analyze?payment=success`,
              receipt_button_text: "Return to App",
              receipt_link_url: `${window.location.origin}/analyze`,
              receipt_thank_you_note: "Thank you for your purchase! Credits will be added to your account within a few minutes."
            }
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: this.storeId
              }
            },
            variant: {
              data: {
                type: "variants",
                id: plan.variantId
              }
            }
          }
        }
      };
      /* @__PURE__ */ console.log("🔍 Creating checkout session, data:", {
        storeId: this.storeId,
        variantId: plan.variantId,
        checkoutData
      });
      const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json"
        },
        body: JSON.stringify(checkoutData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lemonsqueezy API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new LemonsqueezyError(
          `API request failed: ${response.status} ${response.statusText}`,
          "API_REQUEST_FAILED",
          response.status
        );
      }
      const responseData = await response.json();
      if (!responseData.data) {
        throw new LemonsqueezyError(
          "Invalid response from Lemonsqueezy",
          "INVALID_RESPONSE"
        );
      }
      /* @__PURE__ */ console.log("✅ Checkout session created successfully:", responseData.data);
      return responseData;
    } catch (error) {
      console.error("Lemonsqueezy createCheckout error:", error);
      if (error instanceof LemonsqueezyError) {
        throw error;
      }
      throw new LemonsqueezyError(
        "Failed to create checkout session",
        "CHECKOUT_CREATION_FAILED",
        500
      );
    }
  }
  /**
   * Get subscription information
   */
  async getSubscription(subscriptionId) {
    await this.initialize();
    if (!subscriptionId) {
      throw new LemonsqueezyError(
        "Subscription ID is required",
        "MISSING_SUBSCRIPTION_ID"
      );
    }
    try {
      const response = await getSubscription(subscriptionId);
      if (!response.data) {
        return null;
      }
      return response;
    } catch (error) {
      console.error("Lemonsqueezy getSubscription error:", error);
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return null;
      }
      throw new LemonsqueezyError(
        "Failed to get subscription",
        "GET_SUBSCRIPTION_FAILED",
        500
      );
    }
  }
  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    await this.initialize();
    if (!subscriptionId) {
      throw new LemonsqueezyError(
        "Subscription ID is required",
        "MISSING_SUBSCRIPTION_ID"
      );
    }
    try {
      /* @__PURE__ */ console.log("🔄 Calling Lemonsqueezy cancelSubscription API for:", subscriptionId);
      const response = await cancelSubscription(subscriptionId);
      /* @__PURE__ */ console.log("📥 Raw Lemonsqueezy API response:", response);
      /* @__PURE__ */ console.log("📋 Response data:", response?.data);
      /* @__PURE__ */ console.log("📋 Response statusCode:", response?.statusCode);
      /* @__PURE__ */ console.log("📋 Response error:", response?.error);
      if (!response) {
        throw new LemonsqueezyError(
          "No response from Lemonsqueezy API",
          "NO_RESPONSE"
        );
      }
      if (response.error) {
        throw new LemonsqueezyError(
          `Lemonsqueezy API error: ${response.error.message || response.error}`,
          "API_ERROR"
        );
      }
      if (!response.data) {
        /* @__PURE__ */ console.warn("⚠️ No data in response, but no error either. Response:", response);
        throw new LemonsqueezyError(
          "Invalid response from Lemonsqueezy - no data field",
          "INVALID_RESPONSE"
        );
      }
      /* @__PURE__ */ console.log("✅ Valid response received from Lemonsqueezy");
      return response;
    } catch (error) {
      console.error("Lemonsqueezy cancelSubscription error:", error);
      if (error instanceof LemonsqueezyError) {
        throw error;
      }
      throw new LemonsqueezyError(
        "Failed to cancel subscription",
        "CANCEL_SUBSCRIPTION_FAILED",
        500
      );
    }
  }
  /**
   * Verify Webhook signature
   */
  static verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) {
      return false;
    }
    try {
      const crypto = require("crypto");
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(payload, "utf8");
      const expectedSignature = hmac.digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch (error) {
      console.error("Webhook signature verification error:", error);
      return false;
    }
  }
  /**
   * Get plan information
   */
  static getPlan(planId) {
    return SUBSCRIPTION_PLANS[planId];
  }
  /**
   * Get all plans
   */
  static getAllPlans() {
    return Object.values(SUBSCRIPTION_PLANS);
  }
  /**
   * Get plan by variant ID
   */
  static getPlanByVariantId(variantId) {
    return Object.values(SUBSCRIPTION_PLANS).find(
      (plan) => plan.variantId === variantId
    );
  }
  /**
   * Check if service is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.storeId);
  }
  /**
   * Get configuration status
   */
  getConfigStatus() {
    return {
      hasApiKey: !!this.apiKey,
      hasStoreId: !!this.storeId,
      isConfigured: this.isConfigured(),
      plans: Object.keys(SUBSCRIPTION_PLANS).map((planId) => ({
        id: planId,
        hasVariantId: !!SUBSCRIPTION_PLANS[planId].variantId
      }))
    };
  }
}
class SubscriptionManager {
  service;
  constructor() {
    this.service = LemonsqueezyService.getInstance();
  }
  /**
   * Get user subscription status
   */
  async getUserSubscriptionStatus(subscriptionId) {
    try {
      const subscription = await this.service.getSubscription(subscriptionId);
      if (!subscription) {
        return {
          isActive: false,
          status: "not_found",
          subscription: null
        };
      }
      const status = subscription.data.attributes.status;
      const isActive = ["active", "on_trial"].includes(status);
      return {
        isActive,
        status,
        subscription: {
          id: subscription.data.id,
          status: subscription.data.attributes.status,
          statusFormatted: subscription.data.attributes.status_formatted,
          productName: subscription.data.attributes.product_name,
          variantName: subscription.data.attributes.variant_name,
          userEmail: subscription.data.attributes.user_email,
          renewsAt: new Date(subscription.data.attributes.renews_at),
          endsAt: subscription.data.attributes.ends_at ? new Date(subscription.data.attributes.ends_at) : null,
          cancelled: subscription.data.attributes.cancelled,
          trialEndsAt: subscription.data.attributes.trial_ends_at ? new Date(subscription.data.attributes.trial_ends_at) : null,
          urls: subscription.data.attributes.urls,
          cardBrand: subscription.data.attributes.card_brand,
          cardLastFour: subscription.data.attributes.card_last_four
        }
      };
    } catch (error) {
      console.error("Failed to get subscription status:", error);
      return {
        isActive: false,
        status: "error",
        subscription: null,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Check if subscription needs renewal reminder
   */
  async checkRenewalReminder(subscriptionId) {
    try {
      const statusResult = await this.getUserSubscriptionStatus(subscriptionId);
      if (!statusResult.isActive || !statusResult.subscription) {
        return { needsReminder: false };
      }
      const renewalDate = statusResult.subscription.renewsAt;
      const now = /* @__PURE__ */ new Date();
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      const needsReminder = daysUntilRenewal <= 7 && daysUntilRenewal > 0;
      return {
        needsReminder,
        daysUntilRenewal,
        renewalDate
      };
    } catch (error) {
      console.error("Failed to check renewal reminder:", error);
      return { needsReminder: false };
    }
  }
  /**
   * Cancel subscription
   */
  async cancelUserSubscription(subscriptionId) {
    try {
      /* @__PURE__ */ console.log("🚫 Attempting to cancel subscription:", subscriptionId);
      const result = await this.service.cancelSubscription(subscriptionId);
      /* @__PURE__ */ console.log("📋 Cancel subscription API response:", result);
      if (!result) {
        throw new Error("No response from Lemonsqueezy API");
      }
      if (!result.data) {
        console.error("❌ Invalid response structure:", result);
        throw new Error("Invalid response structure from Lemonsqueezy API");
      }
      const subscriptionData = {
        id: result.data.id,
        status: result.data.attributes?.status || "cancelled",
        cancelled: result.data.attributes?.cancelled || true,
        endsAt: result.data.attributes?.ends_at ? new Date(result.data.attributes.ends_at) : null
      };
      /* @__PURE__ */ console.log("✅ Subscription cancelled successfully:", subscriptionData);
      return {
        success: true,
        subscription: subscriptionData
      };
    } catch (error) {
      console.error("❌ Failed to cancel subscription:", error);
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        errorMessage = JSON.stringify(error);
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  /**
   * Get subscription credit information
   */
  getSubscriptionCredits(variantId) {
    const plan = LemonsqueezyService.getPlanByVariantId(variantId);
    return plan?.credits || 0;
  }
  /**
   * Format subscription status display
   */
  formatSubscriptionStatus(status) {
    const statusMap = {
      "active": "Active",
      "on_trial": "On Trial",
      "paused": "Paused",
      "past_due": "Past Due",
      "unpaid": "Unpaid",
      "cancelled": "Cancelled",
      "expired": "Expired"
    };
    return statusMap[status] || status;
  }
  /**
   * Check if subscription can be upgraded/downgraded
   */
  canModifySubscription(status) {
    return ["active", "on_trial"].includes(status);
  }
  /**
   * Get customer portal URL (for managing subscription)
   */
  async getCustomerPortalUrl(subscriptionId) {
    try {
      const statusResult = await this.getUserSubscriptionStatus(subscriptionId);
      if (!statusResult.subscription) {
        return null;
      }
      return statusResult.subscription.urls.customer_portal;
    } catch (error) {
      console.error("Failed to get customer portal URL:", error);
      return null;
    }
  }
  /**
   * Sync subscription status to local database
   */
  async syncSubscriptionStatus(subscriptionId, userId) {
    try {
      const statusResult = await this.getUserSubscriptionStatus(subscriptionId);
      if (!statusResult.subscription) {
        return {
          success: false,
          error: "Subscription not found"
        };
      }
      return {
        success: true,
        subscriptionData: {
          lemonsqueezy_subscription_id: statusResult.subscription.id,
          status: statusResult.subscription.status,
          current_period_start: statusResult.subscription.renewsAt,
          current_period_end: statusResult.subscription.endsAt,
          cancel_at_period_end: statusResult.subscription.cancelled,
          plan_name: statusResult.subscription.variantName,
          plan_credits: this.getSubscriptionCredits(statusResult.subscription.id)
        }
      };
    } catch (error) {
      console.error("Failed to sync subscription status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
const subscriptionManager = new SubscriptionManager();

function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState({
    subscription: null,
    isActive: false,
    isLoading: true,
    error: null,
    canSubscribe: true,
    needsRenewal: false,
    daysUntilRenewal: null
  });
  const fetchUserSubscription = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        subscription: null,
        isActive: false,
        isLoading: false,
        canSubscribe: true,
        needsRenewal: false,
        daysUntilRenewal: null
      }));
      return;
    }
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const { data: subscription, error: subscriptionError } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).in("status", ["active", "on_trial"]).order("created_at", { ascending: false }).limit(1).single();
      if (subscriptionError && subscriptionError.code !== "PGRST116") {
        /* @__PURE__ */ console.log("No active subscription found:", subscriptionError.message);
        setState((prev) => ({
          ...prev,
          subscription: null,
          isActive: false,
          isLoading: false,
          canSubscribe: true,
          needsRenewal: false,
          daysUntilRenewal: null
        }));
        return;
      }
      if (!subscription) {
        /* @__PURE__ */ console.log("No subscription found for user:", user.id);
        setState((prev) => ({
          ...prev,
          subscription: null,
          isActive: false,
          isLoading: false,
          canSubscribe: true,
          needsRenewal: false,
          daysUntilRenewal: null
        }));
        return;
      }
      /* @__PURE__ */ console.log("Found subscription:", subscription);
      const userSubscription = {
        id: subscription.lemonsqueezy_subscription_id,
        status: subscription.status,
        statusFormatted: subscription.status,
        productName: subscription.plan_name || "Unknown Plan",
        variantName: subscription.variant_name || subscription.plan_name || "Unknown Variant",
        renewsAt: new Date(subscription.current_period_end || subscription.created_at),
        endsAt: subscription.ends_at ? new Date(subscription.ends_at) : null,
        cancelled: subscription.cancel_at_period_end || false,
        trialEndsAt: subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
        urls: {
          update_payment_method: subscription.update_payment_method_url || "",
          customer_portal: subscription.customer_portal_url || ""
        },
        cardBrand: subscription.card_brand || "",
        cardLastFour: subscription.card_last_four || "",
        credits: subscription.credits_per_month || 0
      };
      const now = /* @__PURE__ */ new Date();
      const renewalDate = userSubscription.renewsAt;
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      const needsRenewal = daysUntilRenewal <= 7 && daysUntilRenewal > 0;
      const isActive = ["active", "on_trial"].includes(subscription.status);
      setState((prev) => ({
        ...prev,
        subscription: userSubscription,
        isActive,
        isLoading: false,
        canSubscribe: !isActive,
        needsRenewal,
        daysUntilRenewal: daysUntilRenewal > 0 ? daysUntilRenewal : null,
        error: null
      }));
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }));
    }
  }, [user]);
  const cancelSubscription = useCallback(async () => {
    if (!state.subscription || !user) {
      throw new Error("No active subscription to cancel");
    }
    try {
      /* @__PURE__ */ console.log("🚫 Starting subscription cancellation for:", state.subscription.id);
      const result = await subscriptionManager.cancelUserSubscription(state.subscription.id);
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel subscription with Lemonsqueezy");
      }
      /* @__PURE__ */ console.log("✅ Lemonsqueezy subscription cancelled successfully");
      const { error: dbError } = await supabase.from("subscriptions").update({
        status: "cancelled",
        cancel_at_period_end: true,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("user_id", user.id).eq("lemonsqueezy_subscription_id", state.subscription.id);
      if (dbError) {
        /* @__PURE__ */ console.warn("⚠️ Failed to update local database, but Lemonsqueezy cancellation succeeded:", dbError);
      } else {
        /* @__PURE__ */ console.log("✅ Local database updated successfully");
      }
      await fetchUserSubscription();
      return {
        success: true,
        subscription: {
          id: state.subscription.id,
          status: "cancelled",
          cancelled: true,
          endsAt: state.subscription.renewsAt
        }
      };
    } catch (error) {
      console.error("❌ Error canceling subscription:", error);
      throw error;
    }
  }, [state.subscription, user, fetchUserSubscription]);
  const getCustomerPortalUrl = useCallback(async () => {
    if (!state.subscription || !user) {
      return null;
    }
    try {
      /* @__PURE__ */ console.log("🔗 Getting customer portal URL for subscription:", state.subscription.id);
      if (state.subscription.urls.customer_portal) {
        /* @__PURE__ */ console.log("✅ Using stored customer portal URL");
        return state.subscription.urls.customer_portal;
      }
      const { data: subscription } = await supabase.from("subscriptions").select("lemonsqueezy_subscription_id, customer_portal_url").eq("user_id", user.id).in("status", ["active", "on_trial"]).single();
      if (!subscription?.lemonsqueezy_subscription_id) {
        /* @__PURE__ */ console.warn("⚠️ No Lemonsqueezy subscription ID found");
        return `https://app.lemonsqueezy.com/my-orders`;
      }
      try {
        const subscriptionData = await subscriptionManager.getUserSubscriptionStatus(
          subscription.lemonsqueezy_subscription_id
        );
        if (subscriptionData.subscription?.urls?.customer_portal) {
          /* @__PURE__ */ console.log("✅ Got fresh customer portal URL from Lemonsqueezy API");
          await supabase.from("subscriptions").update({
            customer_portal_url: subscriptionData.subscription.urls.customer_portal,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("user_id", user.id).eq("lemonsqueezy_subscription_id", subscription.lemonsqueezy_subscription_id);
          return subscriptionData.subscription.urls.customer_portal;
        }
      } catch (apiError) {
        /* @__PURE__ */ console.warn("⚠️ Failed to get URL from Lemonsqueezy API, using fallback:", apiError);
      }
      if (subscription.customer_portal_url) {
        /* @__PURE__ */ console.log("✅ Using database stored customer portal URL");
        return subscription.customer_portal_url;
      }
      /* @__PURE__ */ console.log("⚠️ Using fallback customer portal URL");
      return `https://app.lemonsqueezy.com/my-orders`;
    } catch (error) {
      console.error("❌ Error getting customer portal URL:", error);
      return `https://app.lemonsqueezy.com/my-orders`;
    }
  }, [state.subscription, user]);
  const syncSubscriptionStatus = useCallback(async () => {
    if (!user || !state.subscription) {
      return;
    }
    try {
      const result = await subscriptionManager.syncSubscriptionStatus(
        state.subscription.id,
        user.id
      );
      if (result.success && result.subscriptionData) {
        const { error } = await supabase.from("subscriptions").update({
          status: result.subscriptionData.status,
          plan_name: result.subscriptionData.plan_name,
          current_period_start: result.subscriptionData.current_period_start?.toISOString(),
          current_period_end: result.subscriptionData.current_period_end?.toISOString(),
          cancel_at_period_end: result.subscriptionData.cancel_at_period_end,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("user_id", user.id).eq("lemonsqueezy_subscription_id", state.subscription.id);
        if (error) {
          console.error("Error updating subscription in database:", error);
        }
      }
    } catch (error) {
      console.error("Error syncing subscription status:", error);
    }
  }, [user, state.subscription]);
  const refreshSubscription = useCallback(async () => {
    await fetchUserSubscription();
  }, [fetchUserSubscription]);
  useEffect(() => {
    fetchUserSubscription();
  }, [fetchUserSubscription]);
  const formatStatus = useCallback((status) => {
    return subscriptionManager.formatSubscriptionStatus(status);
  }, []);
  const canModifySubscription = useCallback((status) => {
    return subscriptionManager.canModifySubscription(status);
  }, []);
  return {
    ...state,
    cancelSubscription,
    getCustomerPortalUrl,
    syncSubscriptionStatus,
    refreshSubscription,
    formatStatus,
    canModifySubscription
  };
}

function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  className = ""
}) {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const handleGoogleSignIn = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      /* @__PURE__ */ console.log("🔐 Starting Google sign in...");
      const { error } = await signInWithGoogle();
      if (error) {
        console.error("🔐 Google sign in error:", error);
        const errorMessage = getGoogleErrorMessage(error.message);
        onError?.(errorMessage);
      } else {
        /* @__PURE__ */ console.log("🔐 Google sign in initiated successfully");
        onSuccess?.();
      }
    } catch (error) {
      console.error("🔐 Google sign in exception:", error);
      onError?.("Google sign in failed, please try again later");
    } finally {
      setLoading(false);
    }
  };
  const getGoogleErrorMessage = (error) => {
    if (error.includes("popup_closed_by_user")) {
      return "Login window was closed, please try again";
    }
    if (error.includes("access_denied")) {
      return "Access denied, please check permissions";
    }
    if (error.includes("network_error")) {
      return "Network error, please check your connection";
    }
    return "Google sign in failed, please try again later";
  };
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: handleGoogleSignIn,
      disabled: disabled || loading,
      className: `
                w-full py-3 px-4 
                bg-white hover:bg-gray-50 
                text-gray-700 
                border border-gray-300 hover:border-gray-400
                rounded-lg font-medium 
                transition-all duration-300 
                disabled:opacity-50 disabled:cursor-not-allowed 
                flex items-center justify-center gap-3
                ${className}
            `,
      children: [
        loading ? /* @__PURE__ */ jsx("div", { className: "w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" }) : /* @__PURE__ */ jsxs("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", children: [
          /* @__PURE__ */ jsx(
            "path",
            {
              fill: "#4285F4",
              d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            }
          ),
          /* @__PURE__ */ jsx(
            "path",
            {
              fill: "#34A853",
              d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            }
          ),
          /* @__PURE__ */ jsx(
            "path",
            {
              fill: "#FBBC05",
              d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            }
          ),
          /* @__PURE__ */ jsx(
            "path",
            {
              fill: "#EA4335",
              d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("span", { children: loading ? "Signing in..." : "Continue with Google" })
      ]
    }
  );
}

z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
z.object({
  email: z.string().email("Please enter a valid email address")
});
function LoginModal({ isOpen, onClose, defaultMode = "login" }) {
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const { signIn, signUp, resetPassword } = useAuth();
  const loginForm = useForm();
  const registerForm = useForm();
  const resetForm = useForm();
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setMessage(null);
      loginForm.reset();
      registerForm.reset();
      resetForm.reset();
    }
  }, [isOpen, defaultMode, loginForm, registerForm, resetForm]);
  const handleLogin = async (data) => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error.message)
        });
      } else {
        setMessage({
          type: "success",
          text: "Login successful!"
        });
        setTimeout(() => {
          onClose();
        }, 1e3);
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage({
        type: "error",
        text: `Login failed: ${error.message || "Please try again later"}`
      });
    } finally {
      setLoading(false);
    }
  };
  const handleRegister = async (data) => {
    /* @__PURE__ */ console.log("🔐 Registration started with data:", { email: data.email, passwordLength: data.password?.length });
    try {
      registerSchema.parse(data);
    } catch (validationError) {
      /* @__PURE__ */ console.log("🔐 Validation error:", validationError.errors);
      setMessage({
        type: "error",
        text: validationError.errors[0]?.message || "Please check your input"
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      /* @__PURE__ */ console.log("🔐 Calling signUp...");
      const { error } = await signUp(data.email, data.password);
      /* @__PURE__ */ console.log("🔐 SignUp result:", { error: error?.message });
      if (error) {
        /* @__PURE__ */ console.log("🔐 Registration error:", error.message);
        setMessage({
          type: "error",
          text: getErrorMessage(error.message)
        });
      } else {
        /* @__PURE__ */ console.log("🔐 Registration successful, showing success message");
        setMessage({
          type: "success",
          text: "Registration successful! Please check your email for the confirmation link to complete your account setup."
        });
        /* @__PURE__ */ console.log("🔐 Setting timeout to close modal in 4 seconds");
        setTimeout(() => {
          /* @__PURE__ */ console.log("🔐 Timeout reached, closing modal");
          onClose();
        }, 1e3);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Registration failed, please try again later"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleReset = async (data) => {
    setLoading(true);
    setMessage(null);
    try {
      await resetPassword(data.email);
      setMessage({
        type: "success",
        text: "Password reset email sent, please check your inbox."
      });
      setTimeout(() => {
        setMode("login");
      }, 2e3);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to send reset email, please try again later"
      });
    } finally {
      setLoading(false);
    }
  };
  const getErrorMessage = (error) => {
    if (error.includes("Invalid login credentials")) {
      return "Invalid email or password";
    }
    if (error.includes("Email not confirmed")) {
      return "Please confirm your email address first";
    }
    if (error.includes("User already registered")) {
      return "This email is already registered";
    }
    if (error.includes("Password should be at least 6 characters")) {
      return "Password must be at least 6 characters";
    }
    if (error.includes("Unable to validate email address")) {
      return "Invalid email address format";
    }
    return error || "Operation failed, please try again later";
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "glass-pane w-full max-w-md mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-6 border-b border-white/10", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-white", children: [
        mode === "login" && "Sign In",
        mode === "register" && "Sign Up",
        mode === "reset" && "Reset Password"
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onClose,
          className: "p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5",
          children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      message && /* @__PURE__ */ jsx("div", { className: `mb-4 p-4 rounded-lg text-sm ${message.type === "success" ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`, children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        message.type === "success" ? /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-green-400 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }) : /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-red-400 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: message.text }),
          message.type === "success" && mode === "register" && /* @__PURE__ */ jsxs("div", { className: "mt-2 text-xs text-green-400/80", children: [
            /* @__PURE__ */ jsx("p", { children: "• Check your email inbox (including spam folder)" }),
            /* @__PURE__ */ jsx("p", { children: "• Click the confirmation link to activate your account" }),
            /* @__PURE__ */ jsx("p", { children: "• You can close this window and return after confirming" })
          ] })
        ] })
      ] }) }),
      (mode === "login" || mode === "register") && /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsx(
          GoogleSignInButton,
          {
            onSuccess: () => {
              setMessage({
                type: "success",
                text: "Redirecting to Google sign in..."
              });
            },
            onError: (error) => {
              setMessage({
                type: "error",
                text: error
              });
            },
            disabled: loading
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center my-6", children: [
          /* @__PURE__ */ jsx("div", { className: "flex-1 border-t border-white/10" }),
          /* @__PURE__ */ jsx("span", { className: "px-4 text-sm text-slate-400", children: "or" }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 border-t border-white/10" })
        ] })
      ] }),
      mode === "login" && /* @__PURE__ */ jsxs("form", { onSubmit: loginForm.handleSubmit(handleLogin), className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Email Address" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "email",
              autoComplete: "email",
              ...loginForm.register("email"),
              className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400",
              placeholder: "Enter your email address",
              disabled: loading
            }
          ),
          loginForm.formState.errors.email && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-400", children: loginForm.formState.errors.email.message })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Password" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              autoComplete: "current-password",
              ...loginForm.register("password"),
              className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400",
              placeholder: "Enter your password",
              disabled: loading
            }
          ),
          loginForm.formState.errors.password && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-400", children: loginForm.formState.errors.password.message })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "submit",
            disabled: loading,
            className: "w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
            children: [
              loading && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
              loading ? "Signing in..." : "Sign In"
            ]
          }
        )
      ] }),
      mode === "register" && /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
        e.preventDefault();
        registerForm.handleSubmit(handleRegister)(e);
      }, className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Email Address" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "email",
              autoComplete: "email",
              ...registerForm.register("email"),
              className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400",
              placeholder: "Enter your email address",
              disabled: loading
            }
          ),
          registerForm.formState.errors.email && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-400", children: registerForm.formState.errors.email.message })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Password" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              autoComplete: "new-password",
              ...registerForm.register("password"),
              className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400",
              placeholder: "Enter password (at least 6 characters)",
              disabled: loading
            }
          ),
          registerForm.formState.errors.password && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-400", children: registerForm.formState.errors.password.message })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Confirm Password" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "password",
              autoComplete: "new-password",
              ...registerForm.register("confirmPassword"),
              className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400",
              placeholder: "Enter password again",
              disabled: loading
            }
          ),
          registerForm.formState.errors.confirmPassword && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-400", children: registerForm.formState.errors.confirmPassword.message })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "submit",
            disabled: loading,
            className: "w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
            children: [
              loading && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
              loading ? "Signing up..." : "Sign Up"
            ]
          }
        )
      ] }),
      mode === "reset" && /* @__PURE__ */ jsxs("form", { onSubmit: resetForm.handleSubmit(handleReset), className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Email Address" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "email",
              ...resetForm.register("email"),
              className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400",
              placeholder: "Enter your registered email address",
              disabled: loading
            }
          ),
          resetForm.formState.errors.email && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-red-400", children: resetForm.formState.errors.email.message })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "submit",
            disabled: loading,
            className: "w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
            children: [
              loading && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
              loading ? "Sending..." : "Send Reset Email"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 pt-6 border-t border-white/10", children: [
        mode === "login" && /* @__PURE__ */ jsxs("div", { className: "text-center space-y-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-slate-400 text-sm", children: [
            "Don't have an account?",
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setMode("register"),
                className: "text-violet-400 hover:text-violet-300 ml-1 font-medium",
                children: "Sign up now"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-slate-400 text-sm", children: [
            "Forgot password?",
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setMode("reset"),
                className: "text-violet-400 hover:text-violet-300 ml-1 font-medium",
                children: "Reset password"
              }
            )
          ] })
        ] }),
        mode === "register" && /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxs("p", { className: "text-slate-400 text-sm", children: [
          "Already have an account?",
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setMode("login"),
              className: "text-violet-400 hover:text-violet-300 ml-1 font-medium",
              children: "Sign in now"
            }
          )
        ] }) }),
        mode === "reset" && /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxs("p", { className: "text-slate-400 text-sm", children: [
          "Remember your password?",
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setMode("login"),
              className: "text-violet-400 hover:text-violet-300 ml-1 font-medium",
              children: "Back to sign in"
            }
          )
        ] }) })
      ] }),
      mode === "register" && /* @__PURE__ */ jsx("div", { className: "mt-4 p-4 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg border border-violet-500/20", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-6 h-6 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", children: /* @__PURE__ */ jsx("svg", { className: "w-3 h-3 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-medium text-white mb-1", children: "Sign up for exclusive benefits" }),
          /* @__PURE__ */ jsxs("ul", { className: "text-xs text-slate-300 space-y-1", children: [
            /* @__PURE__ */ jsx("li", { children: "• Get 200 credits for audio analysis" }),
            /* @__PURE__ */ jsx("li", { children: "• Save analysis history" }),
            /* @__PURE__ */ jsx("li", { children: "• Early access to new features" })
          ] })
        ] })
      ] }) })
    ] })
  ] }) });
}

function UserAccountDropdown({ className = "" }) {
  const { user, signOut, usageStatus } = useAuth();
  const { subscription: userSubscription, isActive: hasActiveSubscription } = useSubscription();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [trialCredits, setTrialCredits] = useState(0);
  let trialCreditContext;
  try {
    trialCreditContext = useTrialCredit();
  } catch (error) {
  }
  const { credits, creditBalance, subscription, loading: creditLoading } = useCredit();
  const handleSignOut = async () => {
    try {
      /* @__PURE__ */ console.log("Starting sign out process...");
      setShowUserMenu(false);
      await signOut();
      /* @__PURE__ */ console.log("Sign out completed");
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
      setShowUserMenu(false);
      if (error?.message === "Auth session missing!" || error?.name === "AuthSessionMissingError") {
        window.location.href = "/";
      } else {
        alert("Sign out completed, but there was a minor issue. You will be redirected.");
        setTimeout(() => {
          window.location.href = "/";
        }, 1e3);
      }
    }
  };
  useEffect(() => {
    if (!user && trialCreditContext?.getTrialCreditBalance) {
      trialCreditContext.getTrialCreditBalance().then((balance) => {
        /* @__PURE__ */ console.log("💳 Navbar: Trial credits updated:", balance.remaining);
        setTrialCredits(balance.remaining);
      }).catch((error) => {
        console.error("Failed to get trial credits in navbar:", error);
        setTrialCredits(100);
      });
    }
  }, [user, trialCreditContext]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest(".user-dropdown-container")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  if (user) {
    const isMobile = className?.includes("mobile-user-dropdown");
    return /* @__PURE__ */ jsxs("div", { className: `relative user-dropdown-container ${className}`, children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setShowUserMenu(!showUserMenu),
          className: `flex items-center gap-2 text-sm text-white/90 hover:text-white transition-all duration-300 ${isMobile ? "px-2 py-1.5 bg-slate-800/30 hover:bg-slate-700/50 rounded-md" : "gap-3 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-md"}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "w-8 h-8 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-semibold", children: user.email?.charAt(0).toUpperCase() }),
            !isMobile && /* @__PURE__ */ jsx("div", { className: "text-left", children: /* @__PURE__ */ jsx("div", { className: "text-white text-sm font-medium", children: creditLoading ? "Loading..." : `${credits} Credits` }) }),
            isMobile && /* @__PURE__ */ jsx("div", { className: "text-white text-xs font-medium", children: creditLoading ? "..." : credits }),
            /* @__PURE__ */ jsx("svg", { className: "w-3 h-3 text-slate-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })
          ]
        }
      ),
      showUserMenu && /* @__PURE__ */ jsxs("div", { className: `absolute mt-2 w-72 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50 ${isMobile ? "right-0" : "right-0"}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-slate-700", children: [
          /* @__PURE__ */ jsx("div", { className: "text-white text-sm font-medium", children: user.email }),
          /* @__PURE__ */ jsx("div", { className: "text-slate-400 text-xs mt-1", children: hasActiveSubscription && userSubscription ? `${userSubscription.productName} Subscription` : "Registered User" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "Credit Balance" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-green-400", children: creditLoading ? "..." : credits })
            ] }),
            creditBalance && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              creditBalance.monthly > 0 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Monthly Credits" }),
                /* @__PURE__ */ jsx("span", { className: "text-blue-400", children: creditBalance.monthly })
              ] }),
              creditBalance.purchased > 0 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Purchased Credits" }),
                /* @__PURE__ */ jsx("span", { className: "text-violet-400", children: creditBalance.purchased })
              ] })
            ] }),
            hasActiveSubscription && userSubscription && /* @__PURE__ */ jsxs("div", { className: "mt-2 pt-2 border-t border-slate-700", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Subscription Status" }),
                /* @__PURE__ */ jsx("span", { className: `capitalize ${userSubscription.status === "active" ? "text-green-400" : userSubscription.status === "cancelled" ? "text-red-400" : "text-yellow-400"}`, children: userSubscription.status === "active" ? "Active" : userSubscription.status === "cancelled" ? "Cancelled" : userSubscription.status === "expired" ? "Expired" : "Pending" })
              ] }),
              userSubscription.status === "active" && /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs mt-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Renewal Date" }),
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: userSubscription.renewsAt.toLocaleDateString("en-US") })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-2", children: [
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/analyze",
              className: "w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" }) }),
                "Analyze Audio"
              ]
            }
          ),
          hasActiveSubscription ? /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/pricing",
              className: "w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [
                  /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }),
                  /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })
                ] }),
                "Manage Subscription"
              ]
            }
          ) : /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/pricing",
              className: "w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" }) }),
                "Purchase Credits"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleSignOut,
              className: "w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }) }),
                "Sign Out"
              ]
            }
          )
        ] })
      ] })
    ] });
  } else {
    return /* @__PURE__ */ jsxs("div", { className: `flex items-center gap-3 ${className}`, children: [
      /* @__PURE__ */ jsxs(
        "a",
        {
          href: "/analyze/",
          className: "hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 hover:border-blue-500/40 rounded-lg backdrop-blur-sm transition-all duration-300 group",
          children: [
            /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-blue-400 group-hover:text-blue-300", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsxs("span", { className: "text-blue-400 group-hover:text-blue-300 text-sm font-semibold transition-colors", children: [
                trialCredits,
                " Credits"
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-slate-400 group-hover:text-slate-300 text-xs transition-colors", children: "Click to start" })
            ] }),
            /* @__PURE__ */ jsx("svg", { className: "w-3 h-3 text-slate-400 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowLoginModal(true);
          },
          "data-login-trigger": true,
          className: "px-4 py-2 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-300 text-sm font-medium backdrop-blur-sm",
          children: "Sign In"
        }
      ),
      showLoginModal && /* @__PURE__ */ jsx(
        LoginModal,
        {
          isOpen: showLoginModal,
          onClose: () => {
            setShowLoginModal(false);
          }
        }
      )
    ] });
  }
}

function Header() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, signOut } = useAuth();
  const { credits, loading: creditLoading, trialCredits } = useCredit();
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest(".dropdown-container")) {
        setShowResourcesMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("header", { className: "fixed top-0 left-0 w-full z-50", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 w-full h-full bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-2xl border-b border-white/5" }),
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent" }),
      /* @__PURE__ */ jsxs("div", { className: "relative max-w-7xl mx-auto px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "h-20 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("a", { href: "/", className: "group relative", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold tracking-tight", children: [
              /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent", children: "Describe" }),
              /* @__PURE__ */ jsx("span", { className: "text-white/70 group-hover:text-white/90 transition-colors duration-300", children: "Music" }),
              /* @__PURE__ */ jsx("span", { className: "text-violet-400/80", children: "." })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-violet-500/20 to-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" })
          ] }),
          /* @__PURE__ */ jsxs("nav", { className: "hidden md:flex items-center gap-6", children: [
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: "/analyze/",
                className: "relative text-slate-300/90 hover:text-white transition-all duration-300 group",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "relative z-10", children: "Music Analyzer" }),
                  /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-violet-400 to-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "relative dropdown-container", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => setShowResourcesMenu(!showResourcesMenu),
                  className: "relative text-slate-300/90 hover:text-white transition-all duration-300 flex items-center gap-1",
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "relative z-10", children: "Resources" }),
                    /* @__PURE__ */ jsx(
                      "svg",
                      {
                        className: `w-3 h-3 transition-transform ${showResourcesMenu ? "rotate-180" : ""}`,
                        fill: "none",
                        stroke: "currentColor",
                        viewBox: "0 0 24 24",
                        children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
                      }
                    ),
                    /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-violet-400 to-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" })
                  ]
                }
              ),
              showResourcesMenu && /* @__PURE__ */ jsx("div", { className: "absolute top-full left-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50", children: /* @__PURE__ */ jsxs("div", { className: "p-2", children: [
                /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: "/pricing",
                    className: "flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-orange-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" }) }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Pricing" }),
                        /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500", children: "Launch special" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: "/blog/",
                    className: "flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-violet-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Blog" }),
                        /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500", children: "Tutorials & insights" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: "/about/",
                    className: "flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-blue-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "font-medium", children: "About" }),
                        /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500", children: "Our technology" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: "/contact/",
                    className: "flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }) }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Contact" }),
                        /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-500", children: "Get support" })
                      ] })
                    ]
                  }
                )
              ] }) })
            ] }),
            /* @__PURE__ */ jsx(UserAccountDropdown, {})
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:hidden flex items-center gap-3", children: [
            user ? /* @__PURE__ */ jsx(UserAccountDropdown, { className: "mobile-user-dropdown" }) : /* @__PURE__ */ jsx(
              "button",
              {
                onClick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLoginModal(true);
                },
                className: "px-3 py-1.5 text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-md transition-all duration-200",
                children: "Sign In"
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setShowMobileMenu(!showMobileMenu),
                className: "relative p-2 text-white/80 hover:text-white transition-colors duration-300 group",
                children: [
                  /* @__PURE__ */ jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) }),
                  /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" })
                ]
              }
            )
          ] })
        ] }),
        showMobileMenu && /* @__PURE__ */ jsx("div", { className: "md:hidden absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800/50 z-50", children: /* @__PURE__ */ jsxs("div", { className: "px-6 py-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1 mb-6", children: [
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/analyze/",
                className: "block px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 font-medium",
                onClick: () => setShowMobileMenu(false),
                children: "Music Analyzer"
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/pricing",
                className: "block px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 font-medium",
                onClick: () => setShowMobileMenu(false),
                children: "Pricing"
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/blog/",
                className: "block px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 font-medium",
                onClick: () => setShowMobileMenu(false),
                children: "Blog"
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/about/",
                className: "block px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 font-medium",
                onClick: () => setShowMobileMenu(false),
                children: "About"
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/contact/",
                className: "block px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 font-medium",
                onClick: () => setShowMobileMenu(false),
                children: "Contact"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "pt-4 border-t border-slate-800/50", children: /* @__PURE__ */ jsx(
            "a",
            {
              href: "/analyze/",
              className: "block w-full text-center px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-300 font-medium shadow-lg",
              onClick: () => setShowMobileMenu(false),
              children: "Try Free"
            }
          ) })
        ] }) })
      ] })
    ] }),
    showMobileMenu && /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/20 z-40 md:hidden",
        onClick: () => setShowMobileMenu(false)
      }
    ),
    showLoginModal && /* @__PURE__ */ jsx(
      LoginModal,
      {
        isOpen: showLoginModal,
        onClose: () => setShowLoginModal(false)
      }
    )
  ] });
}

function HeaderWithAuth() {
  return /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(CreditProvider, { children: /* @__PURE__ */ jsx(Header, {}) }) });
}

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://describemusic.net");
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const t = (key) => key.split(".").reduce((o, i) => o[i], en);
  const canonicalURL = new URL(Astro2.url.pathname, Astro2.site).toString();
  const resolvedImageWithDomain = new URL(
    "/images/logo/social/opengraph-1200x630.jpg",
    Astro2.site
  ).toString();
  const { title, description } = Astro2.props;
  const siteTitle = t("site.title");
  const siteDescription = t("site.description");
  const siteKeywords = t("site.keywords");
  const makeTitle = title ? `${title} | Describe Music` : siteTitle;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><!-- Favicon --><link rel="icon" type="image/x-icon" href="/images/logo/favicon/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/images/logo/favicon/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/images/logo/favicon/favicon-16x16.png"><!-- Apple Touch Icon --><link rel="apple-touch-icon" sizes="180x180" href="/images/logo/app-icons/icon-192-rounded.png"><!-- PWA Icons --><link rel="manifest" href="/manifest.json"><meta name="generator"', '><meta name="keywords"', ">", '<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-HJL4M202R6"><\/script>', '<script type="text/javascript">\n      (function (c, l, a, r, i, t, y) {\n        c[a] =\n          c[a] ||\n          function () {\n            (c[a].q = c[a].q || []).push(arguments);\n          };\n        t = l.createElement(r);\n        t.async = 1;\n        t.src = "https://www.clarity.ms/tag/" + i;\n        y = l.getElementsByTagName(r)[0];\n        y.parentNode.insertBefore(t, y);\n      })(window, document, "clarity", "script", "sxmrkwyxg7");\n    <\/script>', "</head> <body> ", ' <main class="page-content"> ', " </main> ", " ", " </body> </html>"])), addAttribute(Astro2.generator, "content"), addAttribute(siteKeywords, "content"), renderComponent($$result, "SEO", $$SEO, { "title": makeTitle, "description": description || siteDescription, "canonical": canonicalURL, "twitter": {
    creator: "@describemusic",
    site: "@describemusic",
    card: "summary_large_image"
  }, "openGraph": {
    basic: {
      url: canonicalURL,
      type: "website",
      title: makeTitle,
      image: resolvedImageWithDomain
    },
    image: {
      alt: "Describe Music AI-Powered Audio Analysis"
    }
  } }), renderScript($$result, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/Layout.astro?astro&type=script&index=0&lang.ts"), renderHead(), renderSlot($$result, $$slots["header"], renderTemplate` ${renderComponent($$result, "HeaderWithAuth", HeaderWithAuth, { "slot": "header", "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/HeaderWithAuth.tsx", "client:component-export": "default" })} `), renderSlot($$result, $$slots["default"]), renderComponent($$result, "Footer", $$Footer, {}), renderScript($$result, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/Layout.astro?astro&type=script&index=1&lang.ts"));
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/Layout.astro", void 0);

export { $$Layout as $, AuthProvider as A, CreditProvider as C, FREE_PLAN as F, LemonsqueezyService as L, SUBSCRIPTION_PLANS as S, useAuth as a, useCredit as b, LemonsqueezyError as c, useSubscription as u };
