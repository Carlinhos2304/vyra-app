import { useEffect } from "react";
import useOnboardingGuard from "../hooks/useOnboardingGuard";
import { PremiumLoader } from "../components/ui/PremiumLoader";
import { useLanguage } from "../i18n";

export default function Index() {

    const { evaluateSessionRouteState } = useOnboardingGuard();
    const { t } = useLanguage();

    useEffect(() => {
        evaluateSessionRouteState();
    }, []);

    return <PremiumLoader label={t('common.loading')} />;
}