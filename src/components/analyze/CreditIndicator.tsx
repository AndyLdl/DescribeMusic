import React from 'react';
import { CreditCalculator, type CreditConsumptionEstimate } from '../../utils/creditCalculator';
import type { AudioDurationResult } from '../../utils/audioDurationDetector';

interface CreditIndicatorProps {
    currentCredits: number;
    audioDuration?: AudioDurationResult | null;
    creditEstimate?: CreditConsumptionEstimate | null;
    onPurchaseCredits?: () => void;
    className?: string;
}

export default function CreditIndicator({
    currentCredits,
    audioDuration,
    creditEstimate,
    onPurchaseCredits,
    className = ''
}: CreditIndicatorProps) {
    const formattedCredits = CreditCalculator.formatCreditsDisplay(currentCredits);
    const usageSuggestion = CreditCalculator.generateUsageSuggestion(currentCredits);

    return (
        <div className={`glass-pane p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Credit Balance
                </h3>
                <span className="text-2xl font-bold text-green-400">{formattedCredits} Credits</span>
            </div>

            {/* 音频时长和预估消费 */}
            {audioDuration && creditEstimate && (
                <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Audio Duration</span>
                        <span className="text-blue-400 font-medium">{audioDuration.formattedDuration}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Estimated Cost</span>
                        <span className={`font-medium ${creditEstimate.canAfford ? 'text-orange-400' : 'text-red-400'}`}>
                            {creditEstimate.creditsRequired} Credits
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Balance After Analysis</span>
                        <span className={`font-medium ${creditEstimate.balanceAfter >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {CreditCalculator.formatCreditsDisplay(creditEstimate.balanceAfter)} Credits
                        </span>
                    </div>

                    {/* 积分不足警告 */}
                    {!creditEstimate.canAfford && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-red-400 text-sm font-medium">Insufficient Credits</p>
                                    <p className="text-red-300 text-xs mt-1">
                                        Need {creditEstimate.shortfall} more credits to complete analysis
                                    </p>
                                </div>
                            </div>

                            {onPurchaseCredits && (
                                <button
                                    onClick={onPurchaseCredits}
                                    className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
                                >
                                    Purchase Credits
                                </button>
                            )}
                        </div>
                    )}

                    {/* 低积分警告 */}
                    {creditEstimate.canAfford && creditEstimate.balanceAfter < 100 && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <p className="text-yellow-400 text-sm font-medium">Low Credit Balance</p>
                                    <p className="text-yellow-300 text-xs mt-1">
                                        Consider purchasing more credits for continued use
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 使用建议 */}
            {!audioDuration && (
                <div className="text-sm text-slate-300 mb-4">
                    {currentCredits >= 200 ? 'Your credit balance is sufficient for normal service usage.' : usageSuggestion}
                </div>
            )}

            {/* 购买积分按钮 */}
            {currentCredits < 100 && onPurchaseCredits && (
                <button
                    onClick={onPurchaseCredits}
                    className="w-full px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Purchase Credits
                </button>
            )}

            {/* 积分说明 */}
            <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>1 second audio = 1 credit | Registered users get 200 credits monthly</span>
                </div>
            </div>
        </div>
    );
}