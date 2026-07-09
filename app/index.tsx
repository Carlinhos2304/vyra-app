import { useEffect } from "react";
import useOnboardingGuard from "../hooks/useOnboardingGuard";
import { PremiumLoader } from "../components/ui/PremiumLoader";

export default function Index() {

    const { evaluateSessionRouteState } = useOnboardingGuard();

    useEffect(() => {
        evaluateSessionRouteState();
    }, []);

    return <PremiumLoader label="Loading..." />;
}