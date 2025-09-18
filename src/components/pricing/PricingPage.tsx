/**
 * PricingPage Component
 * Wrapper component for the pricing page with providers
 */
import { AuthProvider } from '../../contexts/AuthContext';
import { CreditProvider } from '../../contexts/CreditContext';
import PricingSection from './PricingSection';

export default function PricingPage() {
    return (
        <AuthProvider>
            <CreditProvider>
                <PricingSection />
            </CreditProvider>
        </AuthProvider>
    );
}