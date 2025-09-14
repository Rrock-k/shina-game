/**
 * JournalManager - класс для управления журналом поездок
 * Отслеживает время в пути, места посещения и историю движения
 */
export class JournalManager {
  constructor(timeManager) {
    this.timeManager = timeManager;
    this.journal = [];
    this.currentTrip = null;
    this.currentLocation = null; // текущее место пребывания
    this.locationStartTime = null; // время начала пребывания в месте
  }

  /**
   * Начать новую поездку
   * @param {string} destination - название пункта назначения
   * @param {string} location - ключ локации
   */
  startTrip(destination, location) {
    const gameTime = this.timeManager.getGameTime();
    
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

    // Добавляем завершенную дорогу в журнал (в конец)
    this.journal.push({
      type: 'road',
      destination: this.currentTrip.destination,
      duration: this.currentTrip.duration
    });

    // Записываем начало пребывания в месте
    this.currentLocation = destination;
    this.locationStartTime = this.currentTrip.endTime;
    
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

    // Добавляем завершение пребывания в месте (в конец)
    this.journal.push({
      type: 'work',
      destination: location,
      duration: stayDuration
    });

    console.log(`📝 Завершено пребывание в ${location} в ${currentTime}, время в месте: ${stayDuration}`);

    this.currentLocation = null;
    this.locationStartTime = null;
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
