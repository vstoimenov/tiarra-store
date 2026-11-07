"""Build a source-based enrichment SQL file; unknown OCR tokens require manual review."""
import html
import json
import re
from pathlib import Path

root = Path('/workspace/tiarra-preparation')
products = json.loads((root/'chogan-enriched.json').read_text())['products']
pages = {row['code']: row for row in json.loads((root/'notes/extracted.json').read_text())}
terms = '''Blood Mandarin|червена мандарина
Mandarin Orange|мандарина
Calabrian bergamot|калабрийски бергамот
Sicilian Lemon|сицилиански лимон
Sicilian Orange|сицилиански портокал
Sicilian Mandarin|сицилианска мандарина
Bergamot|бергамот
Grapefruit|грейпфрут
Lemon|лимон
Lime|лайм
Orange|портокал
Mint|мента
Cinnamon|канела
Spicy Notes|пикантни нотки
Rose|роза
Amber|амбър
Leather|кожа
Woody Notes|дървесни нотки
Woodsy Notes|дървесни нотки
Indian Patchouli|индийско пачули
Patchouli|пачули
White Musk|бял мускус
Musk|мускус
Cedar|кедър
Oakmoss|дъбов мъх
oak moss|дъбов мъх
Sandalwood|сандалово дърво
Vanilla|ванилия
Vanille|ванилия
Tonka Bean|тонка
Jasmine Sambac|жасмин самбак
Jasmine|жасмин
Lily-of-the-Valley|момина сълза
Tuberose|тубероза
Freesia|фрезия
Lavender|лавандула
Cardamom|кардамон
Coriander|кориандър
Nutmeg Flower|цвят от индийско орехче
Nutmeg|индийско орехче
Sea Notes|морски нотки
Water Notes|водни нотки
Green Notes|зелени нотки
Fruity Notes|плодови нотки
Floral Notes|цветни нотки
Peach|праскова
Pear|круша
Melon|пъпеш
Magnolia|магнолия
Black Currant|касис
Cassis|касис
Apple|ябълка
Green Apple|зелена ябълка
Red Apple|червена ябълка
Plum|слива
Apricot|кайсия
Pineapple|ананас
Raspberry|малина
Strawberry|ягода
Blackberry|къпина
Coconut|кокос
Cotton Candy|захарен памук
Honey|мед
White Honey|бял мед
Caramel|карамел
Chocolate|шоколад
Cacao|какао
Coffee|кафе
Bitter Almond|горчив бадем
Almond|бадем
Praline|пралина
Tobacco Leaf|тютюнев лист
Tobacco Blossom|тютюнев цвят
Tobacco|тютюн
Incense|тамян
Olibanum|олибанум
Myrrh|смирна
Myrhh|смирна
Opoponax|опопонакс
Benzoin|бензоин
Labdanum|лабданум
Resins|смоли
Vetiver|ветивер
Iris|ирис
Orris Root|корен от ирис
Orris|ирис
Violet Leaf|лист от теменужка
Violet|теменужка
Pink Pepper|розов пипер
Black Pepper|черен пипер
Pepper|пипер
Saffron|шафран
Paprika|пипер
Ginger flower|джинджифилов цвят
Ginger|джинджифил
Orange Blossom|портокалов цвят
Neroli|нероли
Petitgrain|петигрен
Basil|босилек
Rosemary|розмарин
Caraway|ким
Calone|калон
Hedione|хедион
Cyclamen|циклама
Hyacinth|зюмбюл
Hiacynth|зюмбюл
Rose Water|розова вода
Water Lily|водна лилия
Lily|лилия
Peony|божур
Carnation|карамфил
Camation|карамфил
Heliotrope|хелиотроп
Gardenia|гардения
Orchid|орхидея
Osmanthus|османтус
Ylang-Ylang|иланг-иланг
Ylang-Yiang|иланг-иланг
Yi ang-Ylang|иланг-иланг
Birch|бреза
Juniper Berries|хвойнови плодове
Juniper|хвойна
Cypress|кипарис
Artemisia|пелин
Galbanum|галбанум
Pine Tree|бор
Clary Sage|мускатна салвия
Sage|салвия
Marigold|турта
Geranium|здравец
Pelargonium|пеларгониум
Flint|кремък
Green Tea|зелен чай
Tea|чай
Ambergris|амбра
Amberwood|амброво дърво
Ambroxan|амброксан
Cashmeran|кашмеран
Cashmere Wood|кашмирено дърво
Guaiac Wood|гваяково дърво
Brazilian Rosewood|бразилско розово дърво
Agarwood (Oud)|агарово дърво (уд)
Moss|мъх
Smoke|дим
Salt|сол
Sand|пясък
Fruits|плодове
Dried Fruits|сушени плодове
Red Berries|червени плодове
Passionfruit|маракуя
Passion Flower|пасифлора
Tangerine|мандарина
Litchi|личи
Lotus|лотос
Pistachio|шамфъстък
Coumarin|кумарин
Licorice|женско биле
Anise|анасон
Star Anise|звездовиден анасон
Tolu Balsam|толу балсам
Peru Balsam|перуански балсам
Civet|цивет
Ambrofix™|амброфикс
Mimosa|мимоза
Lilac|люляк
Hawthorn|глог
Chamomile|лайка
Mignonette|резеда
Amalfi Lemon|лимон от Амалфи
Virginia Cedar|вирджински кедър
Virginian Cedar|вирджински кедър
Madagascar Vanilla|мадагаскарска ванилия
Bourbon Vanilla|бурбонска ванилия
French labdanum|френски лабданум
Turkish Rose|турска роза
Bulgarian Rose|българска роза
May Rose|майска роза
Damask Rose|дамаска роза
Grasse Rose|роза от Грас
Chinese Jasmine|китайски жасмин
Indian Jasmine|индийски жасмин
Indian Tuberose|индийска тубероза
Moroccan Jasmine|марокански жасмин
African Orange Flower|африкански портокалов цвят
Guatemalan Cardamom|гватемалски кардамон
Tahitian Vetiver|таитянски ветивер
Sichuan Pepper|съчуански пипер
Indonesian Patchouli Leaf|лист от индонезийско пачули
Iso E Super|Iso E Super'''
mapping = dict(line.split('|', 1) for line in terms.splitlines())
mapping.update(dict(line.split('|',1) for line in '''White Rose|бяла роза
White Pear|бяла круша
White Woods|бели дървесни нотки
Exotic Woods|екзотични дървесни нотки
White Cedar Extract|екстракт от бял кедър
Bitter Orange|горчив портокал
Blood Orange|червен портокал
Sour Cherry|вишна
Black Cherry|черна череша
Cherry|череша
Black Amber|черен амбър
Water Jasmine|воден жасмин
Water Peony|воден божур
Water Hyacinth|воден зюмбюл
Styrax|стиракс
Citruses|цитруси
Rum|ром
Papaya flower|цвят от папая
Papaya|папая
Ambrette (Musk Mallow)|амбрета
Fir Resin|смола от ела
Fir|ела
Resin|смола
Narcissus|нарцис
Shiso|шисо
Davana|давана
Candied Fruits|захаросани плодове
Candied Lemon|захаросан лимон
Cypriol Oil or Nagarmotha|циприол
Cypriol Oil or Nagarmatha|циприол
Vanilla Absolute|абсолю от ванилия
Spices|подправки
Green Accord|зелен акорд
Aldehydes|алдехиди
Honeysuckle|орлови нокти
Panacotta|панакота
elemi|елеми
cannabis|канабисов акорд
Rhubarb|ревен
Rhuburb|ревен
Silk Tree blossom|цвят от копринено дърво
Cloves|карамфил
Clove|карамфил
Liquor|ликьор
Myrtle|мирта
Pitosporum|питоспорум
Angelica|ангелика
Seaweed|водорасли
Cognac|коняк
Sweet Orange|сладък портокал
Cumin|кимион
Amyris|амирис
Coconut Powder|кокосов прах
Palo Santo|пало санто
Lactones|лактони
Truffle|трюфел
Mexican chocolate|мексикански шоколад
Tarragon|естрагон
holzige Noten|дървесни нотки
Bellflower|камбанка
Bamboo|бамбук
Parma Violet|пармска теменужка
Apricot Blossom|кайсиев цвят
Amaryllis|амарилис
Thyme|мащерка
Pink Grapefruit|розов грейпфрут
Indian Saffron|индийски шафран
Whipped Cream|бита сметана
Tahitian Vanilla|таитянска ванилия
Tunisian Orange Blossom|тунизийски портокалов цвят
Haitian Vetiver|хаитянски ветивер
Atlas Cedar|атласки кедър
Granny Smith apple|ябълка Грени Смит
Neroli Essence|есенция от нероли
Milk|мляко
Beeswax|пчелен восък
Rice|ориз
Powdery Notes|пудрени нотки
Wisteria|глициния
Taif Rose|роза Таиф
Brown sugar|кафява захар
Olive Blossom|маслинов цвят
Tolu Balsam|толу балсам'''.splitlines()))
ordered = sorted(mapping, key=len, reverse=True)
pattern = re.compile('|'.join(r'(?<![A-Za-z])'+re.escape(term)+r'(?![A-Za-z])' for term in ordered), re.I)
lookup = {key.lower(): value for key, value in mapping.items()}
review = []
statements = ['begin;']
def quote(value):
    return "'"+value.replace("'", "''")+"'"

for product in products:
    code = product['code']
    perfume = {'volume': ' / '.join(str(v['ml'])+' мл' for v in product['volumes'])}
    row = pages.get(code)
    if row and code != '162':
        matches = list(re.finditer(r'(Top|Middle|Base)\s+Notes', row['ocr'], re.I))
        for index, match in enumerate(matches):
            key = {'top':'top', 'middle':'heart', 'base':'base'}[match[1].lower()]
            text = row['ocr'][match.end():matches[index+1].start() if index+1 < len(matches) else len(row['ocr'])]
            text = text.replace('Bergamo!', 'Bergamot').replace('Vanila', 'Vanilla').replace('Sandahvood', 'Sandalwood')
            found = list(pattern.finditer(text))
            remainder = pattern.sub('', text)
            unknown = re.findall(r'[A-Za-z]{3,}', remainder)
            if found and not unknown:
                perfume[key] = ', '.join(dict.fromkeys(lookup[item[0].lower()] for item in found))
            else:
                review.append({'code':code, 'field':key, 'ocr':text, 'unknown':unknown})
    gender = {'male':'Мъжки', 'female':'Дамски', 'unisex':'Унисекс'}[product['gender']]
    existing = product['descriptionHtml']
    details = f'<h3>Характеристики</h3><ul><li>Марка: OLFazeta by CHOGAN.</li><li>Код на аромата: {code}.</li><li>Подходящ за: {gender.lower()}.</li><li>Парфюмна есенция: 30%.</li><li>Разфасовки: {html.escape(perfume["volume"])}.</li></ul>'
    description = existing + details
    seo = f'{product["title"]}. {gender} парфюм с 30% парфюмна есенция. Разфасовки: {perfume["volume"]}. Tiarra Cosmetics.'
    statements.append(f'update store.products set description_html={quote(description)},perfume={quote(json.dumps(perfume,ensure_ascii=False))}::jsonb,seo_title={quote(product["title"]+" | Tiarra Cosmetics")},seo_description={quote(seo)},updated_at=now() where slug={quote(product["slug"])} and is_hidden=true;')
    if row:
        statements.append(f"insert into store.product_images(product_id,source_key,path,width,height,alt,position) select id,'chogan-pyramid-2026:{code}','/catalog/chogan/{code}-notes',769,655,{quote(product['title']+' — ароматна пирамида')},1 from store.products where slug={quote(product['slug'])} and is_hidden=true on conflict(product_id,source_key) do nothing;")
statements.append('commit;')
(root/'enrich.sql').write_text('\n'.join(statements))
(root/'ocr-review-required.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
print(f'Prepared {len(products)} product updates; {len(review)} pyramid fields require review.')
