/**
 * Microsoft Clarity 工具函数
 * 用于设置自定义标识符，提高用户识别准确性
 */

declare global {
    interface Window {
        clarity?: (
            action: string,
            ...args: (string | undefined)[]
        ) => void;
        __clarityIdentityTracker?: {
            calls: Array<{
                action: string;
                args: any[];
                timestamp: number;
            }>;
            lastIdentify?: {
                id: string;  // custom-id (会被哈希)
                session?: string;  // custom-session-id
                page?: string;  // custom-page-id
                userHint?: string;  // friendly-name
                timestamp: number;
            };
        };
    }
}

/**
 * 初始化 Clarity 调用追踪器
 */
function initClarityTracker(): void {
    if (typeof window === 'undefined') return;

    if (!window.__clarityIdentityTracker) {
        window.__clarityIdentityTracker = {
            calls: [],
            lastIdentify: undefined
        };

        // 如果 Clarity 已经加载，立即拦截
        if (window.clarity && typeof window.clarity === 'function') {
            // 保存原始 Clarity 函数
            const originalClarity = window.clarity.bind(window);

            // 尝试从原始队列中恢复调用（如果存在）
            if ((window.clarity as any).q && Array.isArray((window.clarity as any).q)) {
                const queue = (window.clarity as any).q;
                queue.forEach((call: any) => {
                    if (Array.isArray(call) && call.length > 0) {
                        const action = call[0];
                        const args = call.slice(1);
                        window.__clarityIdentityTracker!.calls.push({
                            action,
                            args,
                            timestamp: Date.now()
                        });

                        if (action === 'identify' && args.length > 0) {
                            window.__clarityIdentityTracker!.lastIdentify = {
                                id: args[0] as string,  // custom-id
                                session: args[1] as string | undefined,  // custom-session-id
                                page: args[2] as string | undefined,  // custom-page-id
                                userHint: args[3] as string | undefined,  // friendly-name
                                timestamp: Date.now()
                            };
                        }
                    }
                });
            }

            // 创建新的 Clarity 函数来拦截调用
            const newClarity = function (action: string, ...args: any[]) {
                // 记录调用
                if (window.__clarityIdentityTracker) {
                    window.__clarityIdentityTracker.calls.push({
                        action,
                        args: Array.from(args),
                        timestamp: Date.now()
                    });

                    // 如果是 identify 调用，特别记录
                    if (action === 'identify' && args.length > 0) {
                        window.__clarityIdentityTracker.lastIdentify = {
                            id: args[0] as string,  // custom-id
                            session: args[1] as string | undefined,  // custom-session-id
                            page: args[2] as string | undefined,  // custom-page-id
                            userHint: args[3] as string | undefined,  // friendly-name
                            timestamp: Date.now()
                        };
                    }
                }

                // 调用原始函数
                return originalClarity(action, ...args);
            };

            // 替换 window.clarity
            (window as any).clarity = newClarity;

            // 保持队列属性（如果存在）
            if ((originalClarity as any).q) {
                (newClarity as any).q = (originalClarity as any).q;
            }
        }
    }
}

/**
 * 尽早初始化追踪器（在页面加载时调用）
 */
if (typeof window !== 'undefined') {
    // 立即初始化
    initClarityTracker();

    // 如果 Clarity 还没加载，监听 DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initClarityTracker();
        });
    }

    // 延迟初始化（确保 Clarity 已加载）
    setTimeout(() => {
        initClarityTracker();
    }, 100);
}

/**
 * 检查 Clarity 是否已加载
 */
function isClarityReady(): boolean {
    return typeof window !== 'undefined' && typeof window.clarity === 'function';
}

/**
 * 等待 Clarity 加载完成
 */
function waitForClarity(maxWait = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        if (isClarityReady()) {
            resolve(true);
            return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (isClarityReady()) {
                clearInterval(checkInterval);
                resolve(true);
            } else if (Date.now() - startTime > maxWait) {
                clearInterval(checkInterval);
                resolve(false);
            }
        }, 100);
    });
}

/**
 * 设置 Clarity 自定义标识符
 * 
 * @param identifier - 用户ID或设备指纹（必需）
 * @param sessionId - 会话ID（可选）
 * @param pageId - 页面ID（可选，默认为当前路径）
 * @param friendlyName - 友好名称（可选，如邮箱）
 * @param isDeviceFingerprint - 是否为设备指纹（默认false，表示用户ID）
 */
export async function setClarityIdentity(
    identifier: string,
    sessionId?: string,
    pageId?: string,
    friendlyName?: string,
    isDeviceFingerprint: boolean = false
): Promise<void> {
    try {
        // 初始化追踪器
        initClarityTracker();

        const ready = await waitForClarity();
        if (!ready) {
            console.warn('⚠️ Clarity not ready, skipping identity setup');
            return;
        }

        // 如果没有提供 sessionId，使用当前时间戳生成一个会话ID
        const sessionIdentifier = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 如果没有提供 pageId，使用当前页面路径
        const pageIdentifier = pageId || (typeof window !== 'undefined' ? window.location.pathname : 'unknown');

        // 调用 Clarity identify API
        // 语法: window.clarity("identify", "custom-id", "custom-session-id", "custom-page-id", "friendly-name")
        // 对于设备指纹，使用 "device_" 前缀以便区分
        const customId = isDeviceFingerprint ? `device_${identifier}` : identifier;

        // Clarity API 返回 Promise<{ id, session, page, userHint }>
        const clarityResult = window.clarity?.('identify', customId, sessionIdentifier, pageIdentifier, friendlyName);

        // 如果返回 Promise，处理结果
        if (clarityResult && typeof clarityResult.then === 'function') {
            clarityResult.then((result: any) => {
                console.log('✅ Clarity identity set:', {
                    id: result?.id || customId,  // 哈希后的 ID
                    session: result?.session || sessionIdentifier,
                    page: result?.page || pageIdentifier,
                    userHint: result?.userHint || friendlyName,
                    type: isDeviceFingerprint ? 'device' : 'user'
                });
            }).catch((error: any) => {
                console.warn('⚠️ Clarity identify API warning:', error);
            });
        } else {
            console.log('✅ Clarity identity set:', {
                id: customId,
                session: sessionIdentifier,
                page: pageIdentifier,
                userHint: friendlyName,
                type: isDeviceFingerprint ? 'device' : 'user'
            });
        }
    } catch (error) {
        console.error('❌ Error setting Clarity identity:', error);
    }
}

/**
 * 获取最后设置的 Clarity 标识符信息（用于测试）
 * 返回格式与 Clarity API 文档一致
 */
export function getLastClarityIdentity(): {
    id?: string;  // custom-id (原始值，会被 Clarity 哈希)
    session?: string;  // custom-session-id
    page?: string;  // custom-page-id
    userHint?: string;  // friendly-name
    timestamp?: number;
    type?: 'device' | 'user';
} | null {
    if (typeof window === 'undefined' || !window.__clarityIdentityTracker) {
        return null;
    }

    const lastIdentify = window.__clarityIdentityTracker.lastIdentify;
    if (!lastIdentify) {
        return null;
    }

    return {
        id: lastIdentify.id,
        session: lastIdentify.session,
        page: lastIdentify.page,
        userHint: lastIdentify.userHint,
        timestamp: lastIdentify.timestamp,
        type: lastIdentify.id.startsWith('device_') ? 'device' : 'user'
    };
}

/**
 * 获取所有 Clarity 调用记录（用于测试）
 */
export function getAllClarityCalls(): Array<{
    action: string;
    args: any[];
    timestamp: number;
}> {
    if (typeof window === 'undefined' || !window.__clarityIdentityTracker) {
        return [];
    }

    return window.__clarityIdentityTracker.calls;
}

/**
 * 清除 Clarity 标识符（用户登出时调用）
 * 注意：Clarity 可能不支持清除，但我们可以设置一个匿名标识
 */
export async function clearClarityIdentity(): Promise<void> {
    try {
        const ready = await waitForClarity();
        if (!ready) {
            return;
        }

        // 使用匿名标识符
        const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        window.clarity?.('identify', anonymousId);

        console.log('✅ Clarity identity cleared');
    } catch (error) {
        console.error('❌ Error clearing Clarity identity:', error);
    }
}

/**
 * 更新页面ID（页面导航时调用）
 * 
 * @param identifier - 用户ID或设备指纹
 * @param pageId - 新的页面ID
 * @param friendlyName - 友好名称（可选）
 * @param isDeviceFingerprint - 是否为设备指纹（默认false）
 */
export async function updateClarityPageId(
    identifier: string,
    pageId?: string,
    friendlyName?: string,
    isDeviceFingerprint: boolean = false
): Promise<void> {
    try {
        const ready = await waitForClarity();
        if (!ready) {
            return;
        }

        const pageIdentifier = pageId || (typeof window !== 'undefined' ? window.location.pathname : 'unknown');
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const customId = isDeviceFingerprint ? `device_${identifier}` : identifier;

        // 重新设置标识符，更新页面ID
        window.clarity?.('identify', customId, sessionId, pageIdentifier, friendlyName);

        console.log('✅ Clarity page ID updated:', pageIdentifier);
    } catch (error) {
        console.error('❌ Error updating Clarity page ID:', error);
    }
}

/**
 * 设置 Clarity 自定义标签
 * 
 * @param key - 标签键
 * @param value - 标签值（可以是字符串或字符串数组）
 */
export async function setClarityTag(key: string, value: string | string[]): Promise<void> {
    try {
        const ready = await waitForClarity();
        if (!ready) {
            return;
        }

        window.clarity?.('set', key, value);

        console.log('✅ Clarity tag set:', { key, value });
    } catch (error) {
        console.error('❌ Error setting Clarity tag:', error);
    }
}

/**
 * 发送 Clarity 自定义事件
 * 
 * @param eventName - 事件名称
 */
export async function sendClarityEvent(eventName: string): Promise<void> {
    try {
        const ready = await waitForClarity();
        if (!ready) {
            return;
        }

        window.clarity?.('event', eventName);

        console.log('✅ Clarity event sent:', eventName);
    } catch (error) {
        console.error('❌ Error sending Clarity event:', error);
    }
}

