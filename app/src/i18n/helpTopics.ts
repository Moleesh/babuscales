import type { Localized } from "./types";

// The manual, one topic per tab. Field names are PascalCase
// because this is what a `config` row's body looks like once help content
// actually lives there — this file is the bundled fallback a fresh install
// starts with, not a permanent source. `ta` is authored alongside `en` for
// every entry so the help panel follows the language toggle like the rest
// of the app instead of silently staying in English.
export interface HelpPoint {
    Term: Localized;
    Detail: Localized;
}

export interface HelpTopic {
    /** Tab key this topic answers "?" for — "weigh", "dash", etc. */
    Scope: string;
    Heading: Localized;
    Lead: Localized;
    Points: HelpPoint[];
    Tip: Localized;
}

const loc = (en: string, ta: string): Localized => ({ en, ta });
const point = (term: [string, string], detail: [string, string]): HelpPoint => ({
    Term: loc(...term),
    Detail: loc(...detail),
});

export const DEFAULT_HELP_TOPICS: Record<string, HelpTopic> = {
    weigh: {
        Scope: "weigh",
        Heading: loc("Weighing", "எடையிடல்"),
        Lead: loc("One deck, many lorries in flight.", "ஒரு தளம், பல லாரிகள் ஒரே நேரத்தில்."),
        Points: [
            point(
                ["Tare or Gross", "தார் அல்லது மொத்தம்"],
                [
                    "you say which weight this is. The rule only sets which one is offered first.",
                    "இது எந்த எடை என்பதை நீங்கள்தான் சொல்கிறீர்கள். விதி முதலில் எதை காட்டும் என்பதை மட்டுமே தீர்மானிக்கிறது.",
                ],
            ),
            point(
                ["Save", "சேமி"],
                [
                    "with one weight parks the ticket and frees the deck immediately. The next lorry never waits for the last one to come back.",
                    "ஒரே எடையுடன் சேமிப்பது டிக்கெட்டை நிறுத்திவைத்து தளத்தை உடனே காலி செய்யும். அடுத்த லாரி முந்தையது திரும்பும் வரை காத்திருக்க வேண்டாம்.",
                ],
            ),
            point(
                ["The strip", "மேல் பட்டை"],
                [
                    "across the top is every ticket waiting for its second weight. Click one to pick it up.",
                    "மேலே உள்ள பட்டையில் இரண்டாவது எடைக்காக காத்திருக்கும் அனைத்து டிக்கெட்டுகளும் உள்ளன. ஒன்றை தேர்ந்தெடுக்க கிளிக் செய்யவும்.",
                ],
            ),
            point(
                ["Vehicle No", "வாகன எண்"],
                [
                    "offers what is already known about that lorry — a half-finished ticket, a stored tare, the last load.",
                    "அந்த லாரியைப் பற்றி ஏற்கனவே தெரிந்ததை காட்டும் — பாதி முடிந்த டிக்கெட், சேமிக்கப்பட்ட தார், கடைசி சுமை.",
                ],
            ),
            point(
                ["Enter", "Enter"],
                [
                    "moves to the next field, and keeps moving through the buttons. Space presses a button.",
                    "அடுத்த புலத்திற்கு நகர்த்தும், பட்டன்கள் வழியாகவும் தொடரும். Space பட்டனை அழுத்தும்.",
                ],
            ),
            point(
                ["Go to Cameras", "கேமராக்களுக்கு செல்"],
                [
                    "in the sidebar jumps straight to the Cameras tab without losing your place on the ticket.",
                    "பக்கப்பட்டியில் இது டிக்கெட்டில் உள்ள இடத்தை இழக்காமல் நேரடியாக கேமராக்கள் தாவலுக்கு கொண்டு செல்லும்.",
                ],
            ),
            point(
                ["Send a lorry", "ஒரு லாரியை அனுப்பு"],
                [
                    "is a demo/testing button, not a customer control. Settings → Weighing Rules can hide it site-wide.",
                    "இது டெமோ/சோதனை பட்டன், வாடிக்கையாளர் கட்டுப்பாடு அல்ல. அமைப்புகள் → எடையிடல் விதிகள் இதை தளம் முழுவதும் மறைக்கலாம்.",
                ],
            ),
        ],
        Tip: loc(
            "Nothing reaches the ledger until Save. A lorry that drives off before the first capture leaves no row behind.",
            "சேமிக்கும் வரை எதுவும் லெட்ஜரை சேராது. முதல் எடை எடுக்கும் முன் ஒரு லாரி சென்றுவிட்டால் எந்த வரிசையும் மிச்சமிராது.",
        ),
    },
    dash: {
        Scope: "dash",
        Heading: loc("Dashboard", "டாஷ்போர்டு"),
        Lead: loc("The shift at a glance.", "ஷிப்ட் ஒரே பார்வையில்."),
        Points: [
            point(
                ["Waiting", "காத்திருப்பு"],
                [
                    "are lorries that took a first weight and have not come back.",
                    "முதல் எடை எடுத்துவிட்டு இன்னும் திரும்பி வராத லாரிகள்.",
                ],
            ),
            point(
                ["The period dropdown", "காலக்கட்ட பட்டியல்"],
                [
                    "switches the whole page between day, week, month, year and all-time — the KPIs, the chart and the material split all follow it.",
                    "இது பக்கம் முழுவதையும் நாள், வாரம், மாதம், ஆண்டு, அனைத்து காலம் என மாற்றும் — KPI-கள், விளக்கப்படம், பொருள் பிரிவு அனைத்தும் இதைப் பின்பற்றும்.",
                ],
            ),
            point(
                ["Tickets by hour", "மணிநேரப்படி டிக்கெட்டுகள்"],
                [
                    "is the day view's chart. Wider periods re-bucket by weekday, day-of-month, month or year instead — the lit bar is always where you are now.",
                    "இது நாள் காட்சியின் விளக்கப்படம். பரந்த காலக்கட்டங்களில் வார நாள், மாத நாள், மாதம் அல்லது ஆண்டு அடிப்படையில் மறுவரிசைப்படுத்தும் — ஒளிரும் பட்டை எப்போதும் நீங்கள் இருக்கும் இடத்தைக் காட்டும்.",
                ],
            ),
            point(
                ["Material split", "பொருள் பிரிவு"],
                [
                    "is net tonnes, not ticket count, for whichever period is selected.",
                    "தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்திற்கான நிகர டன், டிக்கெட் எண்ணிக்கை அல்ல.",
                ],
            ),
            point(
                ["Weight unit", "எடை அலகு"],
                [
                    "kg or tonnes — set once in Settings → Formats and every figure on this page follows it.",
                    "கிலோ அல்லது டன் — அமைப்புகள் → வடிவங்களில் ஒருமுறை அமைக்கவும், இந்தப் பக்கத்தின் ஒவ்வொரு எண்ணும் அதைப் பின்பற்றும்.",
                ],
            ),
        ],
        Tip: loc(
            "Every number here is a query over the same ledger Reports searches. There is no second copy to fall out of date.",
            "இங்குள்ள ஒவ்வொரு எண்ணும் அறிக்கைகள் தேடும் அதே லெட்ஜரின் மீதான வினவல்தான். காலாவதியாகும் இரண்டாவது நகல் இல்லை.",
        ),
    },
    cameras: {
        Scope: "cameras",
        Heading: loc("Cameras", "கேமராக்கள்"),
        Lead: loc(
            "Photographic evidence attached to the weight.",
            "எடையுடன் இணைக்கப்பட்ட புகைப்பட ஆதாரம்.",
        ),
        Points: [
            point(["Sources", "மூலங்கள்"], ["USB, IP, RTSP and ONVIF.", "USB, IP, RTSP மற்றும் ONVIF."]),
            point(
                ["Burn-in", "பதிவு"],
                [
                    "ticket number, weight and time are written into the image, so a cropped screenshot still proves itself.",
                    "டிக்கெட் எண், எடை, நேரம் ஆகியவை படத்திலேயே பதிக்கப்படும், எனவே வெட்டப்பட்ட ஸ்கிரீன்ஷாட் கூட தன்னைத்தானே நிரூபிக்கும்.",
                ],
            ),
            point(
                ["Auto-capture", "தானியங்கு படம்"],
                [
                    "fires on the same stable signal the weight uses — the photo and the weight are the same instant.",
                    "எடை பயன்படுத்தும் அதே நிலையான சிக்னலில் இயங்கும் — புகைப்படமும் எடையும் ஒரே கணம்.",
                ],
            ),
        ],
        Tip: loc(
            "Images are content-addressed and stored once.",
            "படங்கள் உள்ளடக்க அடிப்படையில் முகவரியிடப்பட்டு ஒருமுறை மட்டுமே சேமிக்கப்படும்.",
        ),
    },
    reports: {
        Scope: "reports",
        Heading: loc("Reports", "அறிக்கைகள்"),
        Lead: loc(
            "One tab. A ticket list is a report that has not been grouped yet.",
            "ஒரு தாவல். டிக்கெட் பட்டியல் என்பது இன்னும் தொகுக்கப்படாத அறிக்கைதான்.",
        ),
        Points: [
            point(
                ["Tickets", "டிக்கெட்டுகள்"],
                [
                    "every row, searchable. Resume a half-finished one or reprint a finished one from the row.",
                    "ஒவ்வொரு வரிசையும் தேடக்கூடியது. பாதி முடிந்ததை தொடரவோ, முடிந்ததை மீண்டும் அச்சிடவோ வரிசையிலிருந்தே செய்யலாம்.",
                ],
            ),
            point(
                ["Summary", "சுருக்கம்"],
                [
                    "the same rows grouped by material, party, vehicle or transporter.",
                    "அதே வரிசைகள் பொருள், தரப்பு, வாகனம் அல்லது போக்குவரத்தாளர் அடிப்படையில் தொகுக்கப்பட்டவை.",
                ],
            ),
            point(
                ["Cancel", "ரத்து செய்"],
                [
                    "never deletes. The row stays, struck through, with the reason on the audit trail.",
                    "ஒருபோதும் நீக்காது. வரிசை அப்படியே இருக்கும், கோடிடப்பட்டு, காரணம் தணிக்கை பதிவில் இருக்கும்.",
                ],
            ),
        ],
        Tip: loc(
            "There is no separate Tickets tab because there was never a second set of data — only a second way of looking at the same one.",
            "தனி டிக்கெட் தாவல் இல்லை, ஏனெனில் இரண்டாவது தரவுத் தொகுப்பே இல்லை — அதே தரவை பார்க்கும் இரண்டாவது வழி மட்டுமே.",
        ),
    },
    masters: {
        Scope: "masters",
        Heading: loc("Masters", "மாஸ்டர்கள்"),
        Lead: loc(
            "The lists the weighing fields search.",
            "எடையிடல் புலங்கள் தேடும் பட்டியல்கள்.",
        ),
        Points: [
            point(
                ["Parties, Materials, Vehicles", "தரப்புகள், பொருட்கள், வாகனங்கள்"],
                [
                    "each one is what a search field on the Weighing tab looks up.",
                    "இவை ஒவ்வொன்றும் எடையிடல் தாவலில் உள்ள தேடல் புலம் தேடுவது.",
                ],
            ),
            point(
                ["Add as you go", "செல்லும்போதே சேர்"],
                [
                    "typing something new offers to add it here, so the master grows from real work.",
                    "புதிதாக ஏதேனும் தட்டச்சு செய்தால் இங்கு சேர்க்க முன்மொழியும், இதனால் மாஸ்டர் உண்மையான வேலையிலிருந்து வளரும்.",
                ],
            ),
            point(
                ["Stored tares", "சேமிக்கப்பட்ட தார்"],
                [
                    "let a known lorry skip the empty weighment when strict tare is off.",
                    "கண்டிப்பான தார் அணைக்கப்பட்டிருந்தால் தெரிந்த லாரி காலி எடையிடலைத் தவிர்க்க அனுமதிக்கும்.",
                ],
            ),
        ],
        Tip: loc(
            "Strict tare ignores stored tares entirely. That is a per-site rule, not a per-ticket decision.",
            "கண்டிப்பான தார் சேமிக்கப்பட்ட தார்களை முழுவதுமாக புறக்கணிக்கும். இது தள விதி, டிக்கெட் வாரியான முடிவு அல்ல.",
        ),
    },
    settings: {
        Scope: "settings",
        Heading: loc("Settings", "அமைப்புகள்"),
        Lead: loc(
            "Everything configurable, in the database, behind the admin password.",
            "கட்டமைக்கக்கூடிய அனைத்தும், தரவுத்தளத்தில், நிர்வாக கடவுச்சொல்லுக்குப் பின்னால்.",
        ),
        Points: [
            point(
                ["Admin", "நிர்வாகி"],
                [
                    "the lock in the top bar. Unlock once and Settings stays editable for ten minutes.",
                    "மேல் பட்டையில் உள்ள பூட்டு. ஒருமுறை திறந்தால் அமைப்புகள் பத்து நிமிடங்களுக்கு திருத்தக்கூடியதாக இருக்கும்.",
                ],
            ),
            point(
                ["Business", "வணிகம்"],
                [
                    "your site's name, address and phone — printed on tickets, editable here instead of hardcoded.",
                    "உங்கள் தளத்தின் பெயர், முகவரி, தொலைபேசி — டிக்கெட்டுகளில் அச்சிடப்படும், இங்கே திருத்தக்கூடியது.",
                ],
            ),
            point(
                ["Fields", "புலங்கள்"],
                [
                    "the schema is uploaded, not coded. Each field carries its own labels, so a new field arrives already translated.",
                    "ஸ்கீமா பதிவேற்றப்படுகிறது, குறியீடு செய்யப்படவில்லை. ஒவ்வொரு புலமும் அதன் சொந்த லேபிள்களை கொண்டுள்ளது, எனவே புதிய புலம் ஏற்கனவே மொழிபெயர்க்கப்பட்டு வரும்.",
                ],
            ),
            point(
                ["Language packs", "மொழி தொகுப்புகள்"],
                [
                    "are JSON rows too. English is the fallback; a pack only carries what it overrides.",
                    "இவையும் JSON வரிசைகள்தான். ஆங்கிலம் தான் இயல்புநிலை; ஒரு தொகுப்பு அது மேலெழுதுவதை மட்டுமே கொண்டிருக்கும்.",
                ],
            ),
            point(
                ["Data bits / Parity / Stop bits / Line ending / Reverse digits", "Data bits / Parity / Stop bits / Line ending / Reverse digits"],
                [
                    "the indicator's serial framing. Defaults (8, None, 1, line ending 10 = LF) match the most common indicators and most installations never touch them — only change one if Listen below shows garbled or misaligned text. Line ending is the raw decimal ASCII byte value of the terminator (10 = LF, 13 = CR). Reverse digits flips a reading's digit order (sign stays put) for indicators that send the number backwards; it only affects parsed readings, not the raw text Listen shows.",
                    "காட்டியின் serial framing. இயல்புநிலைகள் (8, None, 1, வரி முடிவு 10 = LF) பொதுவான காட்டிகளுக்குப் பொருந்தும், பெரும்பாலான நிறுவல்கள் இவற்றைத் தொடாது — கீழே உள்ள Listen சிதைந்த உரையைக் காட்டினால் மட்டும் மாற்றவும். வரி முடிவு என்பது முடிவுக்குறியின் தசம ASCII மதிப்பு (10 = LF, 13 = CR). Reverse digits எண்ணின் இலக்க வரிசையை தலைகீழாக்கும் (குறி மாறாது) — இது பாகுபடுத்தப்பட்ட அளவீடுகளை மட்டுமே பாதிக்கும், Listen காட்டும் மூல உரையை அல்ல.",
                ],
            ),
            point(
                ["Start char / End char", "தொடக்க / முடிவு எழுத்து"],
                [
                    "trims each line to between two characters before reading the number — a lighter-weight alternative to Custom pattern below for the common case of a weight wrapped in fixed markers (e.g. an indicator sending \"STX012340ETX\"). Whatever is left after trimming is always cleaned down to digits/sign/decimal point before parsing, so stray letters don't need to be excluded by hand. Ignored once Custom pattern is set.",
                    "எண்ணைப் படிக்கும் முன் ஒவ்வொரு வரியையும் இரண்டு எழுத்துகளுக்கு இடையே குறுக்கும் — நிலையான குறிகளுக்குள் அடங்கிய எடைக்கு (எ.கா. \"STX012340ETX\" அனுப்பும் காட்டி) கீழே உள்ள தனிப்பயன் மாதிரியை விட எளிய மாற்று. குறுக்கியபின் மீதமுள்ளவை எப்போதும் இலக்கம்/குறி/புள்ளி என சுத்தம் செய்யப்படும், தேவையற்ற எழுத்துகளை கைமுறையாக விலக்க வேண்டியதில்லை. தனிப்பயன் மாதிரி அமைந்தால் புறக்கணிக்கப்படும்.",
                ],
            ),
            point(
                ["Custom pattern", "தனிப்பயன் மாதிரி"],
                [
                    "a regex with one capture group around the weight, for indicators the built-in numeric extraction can't parse cleanly (a checksum byte or station ID mixed into the same line). Takes priority over Start/End char above. Most installations leave this blank.",
                    "எடையைச் சுற்றி ஒரு capture group கொண்ட regex, உள்ளமைந்த எண் பிரித்தெடுப்பு சுத்தமாக பகுக்க முடியாத காட்டிகளுக்கு (அதே வரியில் கலந்த checksum byte அல்லது station ID). மேலே உள்ள தொடக்க/முடிவு எழுத்துக்கு முன்னுரிமை பெறும். பெரும்பாலான நிறுவல்கள் இதை காலியாக விடும்.",
                ],
            ),
            point(
                ["Listen", "கேட்க தொடங்கு"],
                [
                    "opens the selected port and shows each raw line exactly as it arrives, ignoring the pattern above — use it to work out an unfamiliar indicator's framing (start/end characters, line ending, byte order) before writing a custom pattern.",
                    "தேர்ந்தெடுக்கப்பட்ட போர்ட்டைத் திறந்து, மேலே உள்ள மாதிரியைப் பொருட்படுத்தாமல் ஒவ்வொரு மூல வரியையும் வந்தவுடன் காட்டும் — தனிப்பயன் மாதிரியை எழுதும் முன் காட்டியின் framing-ஐ கண்டறிய இதைப் பயன்படுத்தவும்.",
                ],
            ),
        ],
        Tip: loc(
            "No setting is a file. A config file is the one thing that never gets backed up and never reaches the second terminal.",
            "எந்த அமைப்பும் கோப்பு அல்ல. கட்டமைப்பு கோப்பு என்பது ஒருபோதும் காப்புப் பிரதி எடுக்கப்படாத, இரண்டாவது டெர்மினலை ஒருபோதும் அடையாத ஒன்று.",
        ),
    },
};
