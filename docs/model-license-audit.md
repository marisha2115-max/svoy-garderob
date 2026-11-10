# Проверка моделей перед публичной сборкой — 10 ноября 2026

Решение по делегированному владельцем выбору: публичная сборка не содержит обученных моделей, обучающих наборов, ONNX Runtime или wasm. Обработка однородного фона — собственный алгоритм, без нейросети. Локальные исторические файлы моделей не удалены, но исключены из чистого snapshot репозитория и сайта. Включать их обратно без отдельной проверки нельзя.

## segformer_b2_clothes — исключена

- Автор fine-tuning: mattmdjaga; ONNX-конверсия: Xenova. Архитектура SegFormer: Enze Xie, Wenhai Wang, Zhiding Yu, Anima Anandkumar, Jose M. Alvarez, Ping Luo; NVIDIA/NVlabs.
- Model card прямо ссылается на NVIDIA Source Code License for SegFormer. Пункт3.3 ограничивает использование исследованиями/оценкой; пункт3.1 требует полный текст лицензии и сохранение notices при распространении. Это не универсальная разрешительная лицензия для обычного публичного приложения.
- Fine-tuning на ATR / human_parsing_dataset. Авторы ATR: Xiaodan Liang, Si Liu, Xiaohui Shen, Jianchao Yang, Luoqi Liu, Jian Dong, Liang Lin, Shuicheng Yan. README просит цитирование в академических/коммерческих исследованиях, но не предоставляет исчерпывающий текст лицензии на изображения. Не принимаем отсутствие запрета за разрешение на любую публикацию.
- Источники: https://huggingface.co/mattmdjaga/segformer_b2_clothes/blob/main/README.md ; https://huggingface.co/Xenova/segformer_b2_clothes ; https://github.com/NVlabs/SegFormer/blob/master/LICENSE ; https://github.com/lemondan/HumanParsing-Dataset .

## ORMBG — консервативно исключена

- schirrmacher/ormbg и onnx-community/ormbg-ONNX заявляют Apache-2.0. Локальная ONNX-ревизия034e2d884afbab897e10e78fc5bb566b29533fd6, SHA256 ffbcae62a7b675d616e64cb392ee028786c4cf74f83596590fba13733ef00171.
- Model card описывает обучение на синтетических данных и включение P3M-10K, AIM-500, PPM-100. Синтетический schirrmacher/humans помечен Apache-2.0; P3M-10K release agreement указывает MIT; AIM-500 ссылается на MIT agreement.
- PPM-100: исходные фотографии — Flickr с разрешением коммерческого использования и изменений; аннотированные alpha-mattes — CC BY-NC-SA4.0. Нельзя объявить весь набор свободным для любого использования. Из этого не следует автоматически запрет на распространение любых производных весов, но связь конкретной версии весов с этими данными и применимость условий не установлены. Решение — не включать ORMBG, не выдавая неопределённость за юридически подтверждённый запрет.
- Источники: https://huggingface.co/schirrmacher/ormbg/blob/main/README.md ; https://huggingface.co/onnx-community/ormbg-ONNX/blob/main/README.md ; https://huggingface.co/datasets/schirrmacher/humans ; https://jizhizili.github.io/files/p3m_dataset_agreement/P3M-10k_Dataset_Release_Agreement.pdf ; https://jizhizili.github.io/files/aim_dataset_agreement/AIM-500_Dataset_Release_Agreement.pdf ; https://github.com/ZHKKKe/PPM#license .

## onnxruntime-web — не поставляется

Локальная версия1.22.0-dev.20250409-89f8206ba4. Microsoft Corporation, MIT: разрешает распространение при сохранении copyright и текста лицензии. Лицензия runtime не устраняет ограничения модели или её данных. Из-за отсутствия моделей в публичной версии runtime/wasm также исключены.

Источник: https://github.com/microsoft/onnxruntime/blob/main/LICENSE .

## Приложение и фотографии

38 файлов подтверждены владельцем для публичного набора. Решение владельца и SHA256 записаны в release-assets/photo-approval.json. Техническая проверка не устанавливает наличие у владельца всех прав третьих лиц. Отдельная лицензия на перераспространение этих фотографий пользователями сайта не предоставляется. Обучающие наборы перечисленных моделей не распространяются.
