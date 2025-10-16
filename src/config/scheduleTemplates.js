/**
 * Шаблоны расписания для будних и выходных дней.
 * Каждый шаблон описывает последовательность дел на день без «домашних» пунктов.
 * Возвращение домой обрабатывается планировщиком автоматически.
 */
export const WEEKDAY_TEMPLATES = [
  {
    id: 'weekday-lectures',
    title: 'Учебный марафон',
    tasks: [
      { location: 'institute', name: 'Лекции и семинары', stayHours: 4 },
      { location: 'work', name: 'Проектная работа в офисе', stayHours: 5.5 },
      { location: 'shop', name: 'Перекус и покупки', stayHours: 1 },
      { location: 'relatives', name: 'Созвон с родными', stayHours: 1 },
      { location: 'park_large1', name: 'Вечерняя прогулка в парке', stayHours: 1.5 },
      { location: 'box', name: 'Тренировка в зале', stayHours: 1.5 }
    ]
  },
  {
    id: 'weekday-construction',
    title: 'Стройка и подработки',
    tasks: [
      { location: 'construction1', name: 'Утренний контроль стройки', stayHours: 3.5 },
      { location: 'work', name: 'Офисные задачи', stayHours: 4.5 },
      { location: 'market', name: 'Обед и закупка продуктов', stayHours: 1.5 },
      { location: 'construction2', name: 'Встреча с подрядчиками', stayHours: 2.5 },
      { location: 'institute', name: 'Вечерний факультатив', stayHours: 2 },
      { location: 'redberry', name: 'Кофе с коллегами', stayHours: 1 }
    ]
  },
  {
    id: 'weekday-mentoring',
    title: 'Наставничество и встречи',
    tasks: [
      { location: 'work', name: 'Командные митинги', stayHours: 3.5 },
      { location: 'institute', name: 'Кураторство студентов', stayHours: 3 },
      { location: 'barber', name: 'Быстрая стрижка', stayHours: 1 },
      { location: 'park_medium1', name: 'Прогулка с коллегой', stayHours: 1 },
      { location: 'relatives', name: 'Визит к родственникам', stayHours: 2 },
      { location: 'box', name: 'Вечерняя тренировка', stayHours: 1.5 }
    ]
  }
];

export const WEEKEND_TEMPLATES = [
  {
    id: 'weekend-relax',
    title: 'Отдых и встречи',
    tasks: [
      { location: 'market', name: 'Выезд за свежими продуктами', stayHours: 2 },
      { location: 'park_large2', name: 'Пикник в парке', stayHours: 3 },
      { location: 'relatives', name: 'Семейный обед', stayHours: 3 },
      { location: 'redberry', name: 'Десерт в кофейне', stayHours: 1.5 }
    ]
  },
  {
    id: 'weekend-events',
    title: 'Городские события',
    tasks: [
      { location: 'institute', name: 'Студенческий праздник', stayHours: 3.5 },
      { location: 'park_medium1', name: 'Фестиваль на свежем воздухе', stayHours: 3 },
      { location: 'shop', name: 'Покупка сувениров', stayHours: 1.5 },
      { location: 'work', name: 'Короткая проверка проектов', stayHours: 2 }
    ]
  },
  {
    id: 'weekend-dayoff',
    title: 'Спонтанный день',
    tasks: [
      { location: 'park_large1', name: 'Прогулка по парку', stayHours: 2.5 },
      { location: 'redberry', name: 'Кофе с друзьями', stayHours: 1.5 }
    ]
  }
];
