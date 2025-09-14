// Менеджер игрового времени
export class TimeManager {
  constructor() {
    this.gameTime = {
      year: 2025,
      month: 8, // сентябрь (0-индексированный)
      day: 7,
      hours: 6, // начинаем с 06:00 утра
      minutes: 0
    }; // начинаем с 7 сентября 2025, 06:00
    
    this.baseTimeSpeed = 25; // Базовая скорость времени (1 реальная секунда = 1 игровая минута)
    this.lastTimeUpdate = Date.now();
    this.speedMultiplier = 1;
    this.isPaused = false;
  }

  // Установить множитель скорости
  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = multiplier;
  }

  // Установить состояние паузы
  setPaused(paused) {
    this.isPaused = paused;
  }

  // Обновить игровое время
  update() {
    // Если игра на паузе, не обновляем время
    if (this.isPaused) {
      return;
    }

    const now = Date.now();
    const deltaMs = now - this.lastTimeUpdate;
    this.lastTimeUpdate = now;

    // Ускоряем время: 1 реальная секунда = timeSpeed игровых минут
    const gameMinutes = (deltaMs / 1000) * this.baseTimeSpeed * this.speedMultiplier;

    this.gameTime.minutes += gameMinutes;
    let hourGuard = 0; // защита от бесконечного цикла
    while (this.gameTime.minutes >= 60 && hourGuard < 100) {
      hourGuard++;
      this.gameTime.minutes -= 60;
      this.gameTime.hours += 1;
      if (this.gameTime.hours >= 24) {
        this.gameTime.hours = 0;
        // Переходим к следующему дню
        this.gameTime.day += 1;
        const daysInMonth = this.getDaysInMonth(this.gameTime.year, this.gameTime.month);
        if (this.gameTime.day > daysInMonth) {
          this.gameTime.day = 1;
          this.gameTime.month += 1;
          if (this.gameTime.month >= 12) {
            this.gameTime.month = 0;
            this.gameTime.year += 1;
          }
        }
      }
    }
  }

  // Получить текущее игровое время
  getGameTime() {
    return { ...this.gameTime };
  }

  // Форматировать дату и время для отображения
  formatDateTime() {
    const dayOfWeek = this.getDayOfWeek(this.gameTime.year, this.gameTime.month, this.gameTime.day);
    const dayShort = this.getDayOfWeekShort(dayOfWeek);
    const day = this.gameTime.day.toString().padStart(2, '0');
    const monthShort = this.getMonthName(this.gameTime.month).substring(0, 3);
    const hours = Math.floor(this.gameTime.hours).toString().padStart(2, '0');
    const minutes = Math.floor(this.gameTime.minutes).toString().padStart(2, '0');
    return `<span class="date-part">${dayShort} ${day} ${monthShort} - </span>${hours}:${minutes}`;
  }

  // Получить название месяца
  getMonthName(monthIndex) {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return months[monthIndex];
  }

  // Получить день недели
  getDayOfWeek(year, month, day) {
    const date = new Date(year, month, day);
    return date.getDay();
  }

  // Получить сокращенное название дня недели
  getDayOfWeekShort(dayOfWeek) {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[dayOfWeek];
  }

  // Получить количество дней в месяце
  getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // Проверить, ночное ли время
  isNightTime() {
    const hour = this.gameTime.hours;
    // Ночь с 20:00 до 06:00
    return hour >= 20 || hour < 6;
  }

  // Получить текущий час
  getCurrentHour() {
    return Math.floor(this.gameTime.hours);
  }

  // Получить текущие минуты
  getCurrentMinutes() {
    return Math.floor(this.gameTime.minutes);
  }
}
