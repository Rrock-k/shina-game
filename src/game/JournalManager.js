/**
 * JournalManager - класс для управления журналом поездок
 * Отслеживает время в пути, места посещения и историю движения
 */
export class JournalManager {
  constructor(timeManager) {
    this.timeManager = timeManager;
    this.journal = [];
    this.currentTrip = null;
    this.currentLocation = 'Дом'; // Шина изначально дома
    this.locationStartTime = null; // время начала пребывания в месте
    
    console.log(`📝 Шина начинает дома`);
  }


  /**
   * Установить время начала пребывания в месте
   * @param {string} location - название места
   */
  setLocationStartTime(location) {
    const gameTime = this.timeManager.getGameTime();
    this.currentLocation = location;
    this.locationStartTime = this.formatTime(gameTime);
    console.log(`📝 Начало пребывания в ${location} в ${this.locationStartTime}`);
  }

  /**
   * Начать новую поездку
   * @param {string} destination - название пункта назначения
   * @param {string} location - ключ локации
   */
  startTrip(destination, location) {
    const gameTime = this.timeManager.getGameTime();
    
    // Завершаем предыдущее пребывание в месте, если есть
    if (this.currentLocation && this.locationStartTime) {
      this.endLocationStay(this.currentLocation);
    }
    
    this.currentTrip = {
      id: Date.now(),
      destination: destination,
      location: location,
      startTime: this.formatTime(gameTime),
      endTime: null,
      duration: null,
      status: 'in_progress'
    };

    console.log(`📝 Начата дорога до ${destination} в ${this.currentTrip.startTime}`);
  }

  /**
   * Завершить текущую поездку
   * @param {string} destination - название пункта назначения
   */
  endTrip(destination) {
    if (!this.currentTrip) return;

    const gameTime = this.timeManager.getGameTime();
    
    this.currentTrip.endTime = this.formatTime(gameTime);
    this.currentTrip.duration = this.calculateDuration(this.currentTrip.startTime, this.currentTrip.endTime);
    this.currentTrip.status = 'completed';

    const previousRecordTime = this.getLastRecordTime();
    const timeFromPrevious = this.calculateTimeFromPrevious(previousRecordTime, this.currentTrip.endTime);

    // Добавляем завершенную дорогу в журнал (в конец)
    this.journal.push({
      type: 'road',
      destination: this.currentTrip.destination,
      duration: this.currentTrip.duration,
      timeFromPrevious: timeFromPrevious,
      absoluteTime: this.currentTrip.endTime
    });

    // Записываем начало пребывания в месте
    this.currentLocation = destination;
    this.locationStartTime = this.currentTrip.endTime;
    
    // Добавляем запись о входе в здание сразу
    // Для записи о работе timeFromPrevious должен быть 0, так как это сразу после дороги
    this.journal.push({
      type: 'work',
      destination: destination,
      duration: '0м', // Время работы пока 0, будет обновлено при выходе
      timeFromPrevious: '0м', // Сразу после дороги, без перерыва
      absoluteTime: this.currentTrip.endTime,
      isActive: true // Флаг активной записи
    });
    
    console.log(`📝 Завершена дорога до ${this.currentTrip.destination} в ${this.currentTrip.endTime}, время в пути: ${this.currentTrip.duration}`);
    console.log(`📝 Начало пребывания в ${destination} в ${this.currentTrip.endTime}`);

    this.currentTrip = null;
  }

  /**
   * Получить все записи журнала
   * @returns {Array} массив записей поездок
   */
  getJournal() {
    return [...this.journal];
  }

  /**
   * Получить текущую поездку
   * @returns {Object|null} текущая поездка или null
   */
  getCurrentTrip() {
    return this.currentTrip;
  }

  /**
   * Завершить пребывание в месте
   * @param {string} location - название места
   */
  endLocationStay(location) {
    if (!this.currentLocation || !this.locationStartTime) return;

    const gameTime = this.timeManager.getGameTime();
    const currentTime = this.formatTime(gameTime);
    const stayDuration = this.calculateDuration(this.locationStartTime, currentTime);

    // Находим и обновляем последнюю активную запись о работе
    for (let i = this.journal.length - 1; i >= 0; i--) {
      if (this.journal[i].type === 'work' && this.journal[i].isActive) {
        this.journal[i].duration = stayDuration;
        this.journal[i].isActive = false; // Деактивируем запись
        break;
      }
    }

    console.log(`📝 Завершено пребывание в ${location} в ${currentTime}, время в месте: ${stayDuration}`);

    this.currentLocation = null;
    this.locationStartTime = null;
  }


  /**
   * Получить время последней записи в журнале
   * @returns {string|null} время последней записи или null
   */
  getLastRecordTime() {
    if (this.journal.length === 0) {
      // Если журнал пуст, используем время начала игры (00:00)
      return '00:00';
    }
    
    const lastEntry = this.journal[this.journal.length - 1];
    return lastEntry.absoluteTime || '00:00';
  }

  /**
   * Рассчитать время от предыдущей записи
   * @param {string} previousTime - время предыдущей записи
   * @param {string} currentTime - текущее время
   * @returns {string} время от предыдущей записи
   */
  calculateTimeFromPrevious(previousTime, currentTime) {
    if (!previousTime) return currentTime;
    
    const [prevHours, prevMinutes] = previousTime.split(':').map(Number);
    const [currHours, currMinutes] = currentTime.split(':').map(Number);
    
    const prevTotalMinutes = prevHours * 60 + prevMinutes;
    const currTotalMinutes = currHours * 60 + currMinutes;
    
    let durationMinutes = currTotalMinutes - prevTotalMinutes;
    
    // Учитываем переход через день
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    return this.formatDuration(durationMinutes);
  }

  /**
   * Добавить время к предыдущей записи (для получения абсолютного времени)
   * @param {string} timeFromPrevious - время от предыдущей записи
   * @returns {string} абсолютное время
   */
  addTimeToPrevious(timeFromPrevious) {
    // Это упрощенная версия - в реальности нужно парсить timeFromPrevious
    // и добавлять к предыдущему времени, но для простоты возвращаем текущее время
    const gameTime = this.timeManager.getGameTime();
    return this.formatTime(gameTime);
  }

  /**
   * Очистить журнал
   */
  clearJournal() {
    this.journal = [];
    this.currentTrip = null;
    console.log('📝 Журнал очищен');
  }

  /**
   * Вычислить продолжительность поездки
   * @param {string} startTime - время начала (HH:MM)
   * @param {string} endTime - время окончания (HH:MM)
   * @returns {string} отформатированная продолжительность
   */
  calculateDuration(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    let durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Учитываем переход через день
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    return this.formatDuration(durationMinutes);
  }

  /**
   * Форматировать время для отображения
   * @param {Object} gameTime - игровое время
   * @returns {string} отформатированное время
   */
  formatTime(gameTime) {
    const hours = Math.floor(gameTime.hours).toString().padStart(2, '0');
    const minutes = Math.floor(gameTime.minutes).toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  }

  /**
   * Форматировать продолжительность
   * @param {number} minutes - минуты
   * @returns {string} отформатированная продолжительность
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    } else {
      return `${mins}м`;
    }
  }



}
