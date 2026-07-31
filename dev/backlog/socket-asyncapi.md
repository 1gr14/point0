---
title: AsyncAPI для сокет-поверхности (@point0/asyncapi)
description:
  Новый пакет по аналогии с @point0/openapi — AsyncAPI-документ из
  channel/space/handler-деклараций, отдаваемый той же мидлварной механикой.
---

AsyncAPI (v3, asyncapi.com) — индустриальный стандарт описания message-driven
API, аналог OpenAPI для сокетов: channels / operations (send/receive) / messages
с JSON-Schema payload'ами, есть ws-биндинги и AsyncAPI Studio с рендером доки.

Сделать новый пакет **по аналогии с @point0/openapi** — тот же стиль
подключения: воткнул мидлвару → получил эндпоинт с документом (+ опционально
UI-рендер), всё генерится из деклараций поинтов.

## Что генерить из чего

- **channels** AsyncAPI ← наши каналы и спейсы (вход канала/спейса — `.input`
  схемы; identity как описание, не схема — она серверная).
- **messages** ← схемы хендлеров: `clientSend` (client → server send),
  `serverSend` (server → client push), reply-тип `serverReply` (описать как
  ответ операции), `.clientReply`-схема (client → server reply). Конвертация
  схем в JSON Schema — та же машинерия схем-адаптеров, что уже кормит
  @point0/openapi (переиспользовать, не дублировать).
- **operations** ← пары send/receive per handler; clientHandler без
  `.clientSend` — чистая receive-операция без запроса.
- **servers/bindings** ← ws-биндинг на `GET /_point0/<scope>/websocket` +
  описание хендшейка (POST коннектор → ticket → claim) в description; кадровый
  конверт (`t`-поля) описать текстом/примерами — AsyncAPI это позволяет.
- Оговорка про payload-строки: полезные нагрузки сериализованы трансформером
  поинта (вложенный JSON / superjson) — зафиксировать в description сообщений.

## Форма пакета

- `@point0/asyncapi`: `asyncApiDocument(points, options)` +
  мидлвара/поинт-хелпер, отдающий JSON по URL (и, как у openapi, опционально
  страницу с рендером — AsyncAPI React component или ссылка на Studio).
- Опции в стиле openapi-пакета: title/version/servers, фильтрация по тегам,
  кастомизация per point.
- Тесты по образу packages/openapi/tests.

## Зачем

- Машинно-читаемое описание сокет-поверхности = документация «как дёргать в
  голую» бесплатно (кодогенераторы клиентов у AsyncAPI-экосистемы уже есть).
- Паритет истории: «HTTP описан OpenAPI, сокеты — AsyncAPI» — сильный
  DX/маркетинг-пункт.

Делать после ручной верификации словаря (переименование в сокет-словарь уже
выполнено — словарь стабилен).
