import tiktoken
from nltk.tokenize import sent_tokenize
from collections.abc import Callable
from collections.abc import Iterator

def check_number_of_tokens(text: str) -> int:
    encode_fn = tiktoken.get_encoding("cl100k_base").encode
    return len(encode_fn(text))


def split_section_by_tokens(text: str, max_tokens: int, overlap_ratio: float = 0.3, buffer_percent=0.2, encode_fn: Callable[[str], list] | None = None, decode_fn : Callable[[list],[str]] | None = None) -> list:

    buffer_tokens = int(max_tokens * buffer_percent)
    max_tokens = max_tokens - buffer_tokens

    #encode_fn = tiktoken.get_encoding("cl100k_base").encode
    sentences = sent_tokenize(text)
    sentence_tokens = [(sentence, len(encode_fn(sentence))) for sentence in sentences]

    sections = []
    current_section = []
    current_length = 0

    max_overlap = int(max_tokens * overlap_ratio)
    if max_overlap >= max_tokens:
        raise ValueError("Overlap is too large relative to max_tokens")

    for sentence, token_length in sentence_tokens:
        if token_length > max_tokens:
            if current_section:
                sections.append(' '.join(current_section).strip())
                current_section = []
                current_length = 0

            # Split the long sentence into smaller parts
            encoded_sentence = encode_fn(sentence)
            start = 0
            while start < len(encoded_sentence):
                end = min(start + max_tokens, len(encoded_sentence))
                part = encoded_sentence[start:end]
                sections.append(decode_fn(part))
                start += max_tokens - max_overlap
        elif current_length + token_length <= max_tokens:
            current_section.append(sentence)
            current_length += token_length
        else:
            sections.append(' '.join(current_section).strip())
            current_section = [sentence]
            current_length = token_length

    if current_section:
        sections.append(' '.join(current_section).strip())

    return sections


def main(text, max_tokens=500):
    from typing import cast

    from typing import cast
    llm_tokenizer = tiktoken.get_encoding("cl100k_base")
    encode_fn = cast(
        Callable[[str], list[int]], llm_tokenizer.encode
    )


    decode_fn = cast(
        Callable[[list], [str]], llm_tokenizer.decode
    )
    print(f'Total tokens: {check_number_of_tokens(text,encode_fn)}')
    sections = split_section_by_tokens(text, max_tokens)
    for idx, section in enumerate(sections):
        print(f"Section {idx + 1}: tokens: {check_number_of_tokens(section,encode_fn)}\n{section}\n")


if __name__ == "__main__":
    # Example usage with Arabic text:
    arabic_text = """
       أدى الرئيس الإيراني المنتخب، مسعود بزشكيان، الثلاثاء، اليمين الدستورية كرئيس لإيران أمام البرلمان وبحضور وفود دولية.

       وبدأت مراسم أداء اليمين بكلمة للرئيس الجديد قال فيها إن أمام بلاده فرصة لتحقيق الإصلاح وخلق أمل جديد في إيران.

       وتعهد الرئيس الإيراني بالابتعاد عن الفساد والتمييز ومكافحة الفقر، كما أكد الالتزام بمبدأ الثورة وولاية الفقيه.

       ودعا بزشكيان جميع الأطراف للتعاون من أجل حل أزمات المنطقة، كما أكد أن من أولوياته تطوير العلاقات مع دول الجوار.

       وقبل أيام، أعلن المرشد الأعلى علي خامنئي، الأحد، تنصيب الإصلاحي مسعود بزشكيان رئيسا جديدا لجمهورية إيران، بعد فوزه بالانتخابات التي أجريت في أعقاب مصرع إبراهيم رئيسي في حادث تحطم مروحية.

       وتفوق بزشكيان في الدورة الثانية من الانتخابات الرئاسية التي أجريت في الخامس من يوليو، على المحافظ المتشدد سعيد جليلي. """
    eng_text = """
       A path from a point approximately 330 metres east of the most south westerly corner of 17 Batherton Close, Widnes and approximately 208 metres east-south-east of the most southerly corner of Unit 3 Foundry Industrial Estate, Victoria Street, Widnes, proceeding in a generally east-north-easterly direction for approximately 28 metres to a point approximately 202 metres east-south-east of the most south-easterly corner of Unit 4 Foundry Industrial Estate, Victoria Street, and approximately 347 metres east of the most south-easterly corner of 17 Batherton Close, then proceeding in a generally northerly direction for approximately 21 metres to a point approximately 210 metres east of the most south-easterly corner of Unit 5 Foundry Industrial Estate, Victoria Street, and approximately 202 metres east-south-east of the most north-easterly corner of Unit 4 Foundry Industrial Estate, Victoria Street, then proceeding in a generally east-north-east direction for approximately 64 metres to a point approximately 282 metres east-south-east of the most easterly corner of Unit 2 Foundry Industrial Estate, Victoria Street, Widnes and approximately 259 metres east of the most southerly corner of Unit 4 Foundry Industrial Estate, Victoria Street, then proceeding in a generally east-north-east direction for approximately 350 metres to a point approximately 3 metres west-north-west of the most north westerly corner of the boundary fence of the scrap metal yard on the south side of Cornubia Road, Widnes, and approximately 47 metres west-south-west of the stub end of Cornubia Road be diverted to a 3 metre wide path from a point approximately 183 metres east-south-east of the most easterly corner of Unit 5 Foundry Industrial Estate, Victoria Street and approximately 272 metres east of the most north-easterly corner of 26 Ann Street West, Widnes, then proceeding in a generally north easterly direction for approximately 58 metres to a point approximately 216 metres east-south-east of the most easterly corner of Unit 4 Foundry Industrial Estate, Victoria Street and approximately 221 metres east of the most southerly corner of Unit 5 Foundry Industrial Estate, Victoria Street, then proceeding in a generally easterly direction for approximately 45 metres to a point approximately 265 metres east-south-east of the most north-easterly corner of Unit 3 Foundry Industrial Estate, Victoria Street and approximately 265 metres east of the most southerly corner of Unit 5 Foundry Industrial Estate, Victoria Street, then proceeding in a generally east-south-east direction for approximately 102 metres to a point approximately 366 metres east-south-east of the most easterly corner of Unit 3 Foundry Industrial Estate, Victoria Street and approximately 463 metres east of the most north easterly corner of 22 Ann Street West, Widnes, then proceeding in a generally north-north-easterly direction for approximately 19 metres to a point approximately 368 metres east-south-east of the most easterly corner of Unit 3 Foundry Industrial Estate, Victoria Street and approximately 512 metres east of the most south easterly corner of 17 Batherton Close, Widnes then proceeding in a generally east-south, easterly direction for approximately 16 metres to a point approximately 420 metres east-south-east of the most southerly corner of Unit 2 Foundry Industrial Estate, Victoria Street and approximately 533 metres east of the most south-easterly corner of 17 Batherton Close, then proceeding in a generally east-north-easterly direction for approximately 240 metres to a point approximately 606 metres east of the most northerly corner of Unit 4 Foundry Industrial Estate, Victoria Street and approximately 23 metres south of the most south westerly corner of the boundary fencing of the scrap metal yard on the south side of Cornubia Road, Widnes, then proceeding in a generally northern direction for approximately 44 metres to a point approximately 3 metres west-north-west of the most north westerly corner of the boundary fence of the scrap metal yard on the south side of Cornubia Road and approximately 47 metres west-south-west of the stub end of Cornubia Road.
       """
    eng_shot_text = """
   Adhir Chowdhury said during the Lok Sabha polls, Congress chief Mallikarjun Kharge's statement that the former would be kept out if necessary had upset him.

    Congress leader Adhir Ranjan Chowdhury on Tuesday questioned the party's leadership for removing him as chief of its West Bengal unit without prior intimation. He claimed he had resigned after the Lok Sabha elections but he wasn't informed whether or not the resignation was accepted.
    Adhir Ranjan Chowdhury(PTI file photo)
    Adhir Ranjan Chowdhury(PTI file photo)

    He said during the Lok Sabha polls, Congress chief Mallikarjun Kharge's statement that the former would kept out if necessary had upset him.
    Looking for Instant Cash? Get Best Personal Loan offers upto 10 lakh. Apply and Get Money in your bank account Instantly

    "The day Mallikarjun Kharge became the party president, all other posts of the party in the country became temporary, according to the Constitution of the party. Even my post became temporary...While the election was underway, Mallikarjun Kharge said on television that if necessary I would be kept out, which made me upset," he told the media.

    Adhir Ranjan Chowdhury said that he was being replaced was announced in a party meeting.

    "The election results were also not good for the party in West Bengal. Even though I was the temporary party president, it was my responsibility. After which I told Kharge ji that if possible, you can replace me with someone else...In between I was informed by AICC to call a meeting of Congress leaders of West Bengal as the party wanted to pass two resolutions...I was aware that the meeting had been called under my presidency and I was still the West Bengal Congress president but during the meeting, Ghulam Ali Mir while addressing said that the former president is also here. At that time, I got to know I had become former president (of West Bengal Congress)," he said.

    "I had sent my resignation to Kharge ji, but no one informed me if it was accepted or not. Kharge ji didn’t reply to my letter. If accepted, I should be informed as per courtesy," he added, per India Today.

    During the Lok Sabha elections, Adhir Ranjan Chowdhury kept sniping at Mamata Banerjee even though the Congress and TMC were in the midst of talks for an alliance. Later, the TMC called off the talks and blamed Chowdhury for its decision.

    Mamata Banerjee's party contested the elections alone and scored a landslide victory in the state."""
    telugu_text = """ విలక్షణ దర్శకుడు ఏఆర్ మురగదాస్- కోలీవుడ్ స్టార్ హీరో సూర్య కాంబినేషన్‌లో తెరకెక్కిన చిత్రం గజిని. 19 ఏళ్ల క్రితం విడుదలైన ఈ సినిమా కలెక్షన్ల వర్షం కురిపించింది. కథ, స్క్రీన్ ప్లే, సూర్య నటన, నయనతార- అసిన్ అందాలు, మురగదాస్ టేకింగ్, హ్యారిస్ జయరాజ్ మ్యూజిక్‌ 'గజిని'ని బ్లాక్‌బస్టర్‌గా నిలబెట్టాయి.

మెమెంటో అనే అమెరికన్ మూవీ ఆధారంగా తమిళ నేటివిటీకి తగినట్లుగా కథలు మార్పులు చేర్పులు జోడించి గజిని స్క్రిప్ట్ తయారుచేశారు మురుగదాస్. ఓ సంపన్నుడైన యువకుడు విలన్ల కారణంగా తన ప్రేయసిని కోల్పోయి తీవ్రమైన మతిమరుపు వ్యాధితో బాధపడుతూనే శత్రువులపై ప్రతీకారం తీర్చుకోవడం అనేది స్థూలంగా గజిని సినిమా థీమ్. ఓ రివెంజ్ డ్రామాకు కమర్షియల్ అంశాలు మేళవించి మురగదాస్ సెల్యూలాయిడ్‌పై గజినిని ఆవిష్కరించారు.
power star pawan kalyan revealed why he rejected gajini remake

అయితే గజిని కథను ఏ హీరో దగ్గరికి తీసుకెళ్లినా స్క్రిప్ట్ బాగుందని చెప్పడం, హీరో గెటప్ విషయంలో గుండు కొట్టించుకోవాల్సి ఉండటంతో రిజెక్ట్ చేయడం జరిగిందని స్వయంగా మురగదాస్ తెలిపారు. అజిత్, మాధవన్ వంటి అగ్ర కథానాయకులు సైతం ఈ లిస్ట్‌లో ఉన్నారట. అలా దాదాపు 12 మంది హీరోల చేతిలో తిరస్కారానికి గురైన గజిని కథ.. చివరికి సూర్య వద్దకు చేరింది. సినిమా కోసం ఎంత రిస్క్‌కైనా ఓకే అని సూర్య భరోసా ఇవ్వడమే కాదు.. షూటింగ్‌కు ముందే జుట్టు మొత్తం తీసేసి ఫోటో షూట్, లుక్ టెస్టులోనే వావ్ అనిపించారట. ఈ చిత్రంలోని సంజయ్ రామస్వామి క్యారెక్టర్‌కు సూర్య తన నటనతో జీవం పోశారు. ఆ రోల్‌లో ఆయనను తప్పించి మరొకరిని ప్రేక్షకులు ఊహించుకోలేరంటే అతిశయోక్తి కాదు.

తెలుగు, తమిళ భాషల్లో ప్రభంజనం సృష్టించడంతో పాటు గజిని ద్వారా తెలుగునాట సూర్యకు ఫ్యాన్ ఫాలోయింగ్‌ ఏర్పడింది. ఇదే కథను హిందీలోనూ అమీర్‌ఖాన్‌తో గజినినీ రీమేక్ చేసి బంపర్‌హిట్ కొట్టారు మురగదాస్. బాలీవుడ్‌లో రూ.100 కోట్లు వసూళ్లు సాధించిన తొలి చిత్రంగా గజిని చరిత్రలో నిలిచిపోయింది. హిందీలో తొలుత సల్మాన్ ఖాన్‌తో ఈ సినిమాను తీయాలని భావించినప్పటికీ.. విలన్‌గా చేసిన ప్రదీప్ రావత్ సూచన మేరకు అమీర్‌ఖాన్‌ను ఎంపిక చేశారట."""
    # main(eng_text,max_tokens=400)
    # main(arabic_text, max_tokens=200)
    # main (text= arabic_text + "\n"+eng_text, max_tokens=800)
    # main(text=arabic_text + "\n" + eng_shot_text, max_tokens=300)
    main(text=telugu_text, max_tokens=250)
