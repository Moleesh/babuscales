import styles from "./RecallBanner.module.css";

export interface RecallOffer {
    key: string;
    label: string;
    hint: string;
    onAccept: () => void;
}

export interface RecallBannerProps {
    offers: RecallOffer[];
}

// PLAN §9.2 — "Recall is not silent prefill... each item a separate choice
// the operator accepts or ignores." Nothing here applies itself.
export const RecallBanner = ({ offers }: RecallBannerProps) => {
    if (offers.length === 0) return null;

    return (
        <div className={styles.banner}>
            <span className={styles.title}>The database already knows this vehicle</span>
            <div className={styles.offers}>
                {offers.map((offer) => (
                    <button
                        key={offer.key}
                        type="button"
                        className={styles.offer}
                        onClick={offer.onAccept}
                    >
                        <span>{offer.label}</span>
                        <small>{offer.hint}</small>
                    </button>
                ))}
            </div>
        </div>
    );
};
