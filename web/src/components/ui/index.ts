// Библиотека переиспользуемых UI компонентов
// Используйте эти компоненты вместо создания новых для обеспечения единообразия интерфейса

export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export { default as DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';

export { Skeleton, SkeletonValue } from './Skeleton';

export { default as Dropdown } from './Dropdown';
export type { DropdownProps, DropdownOption } from './Dropdown';

export { default as DateTimePicker } from './DateTimePicker';
export type { DateTimePickerProps } from './DateTimePicker';

export { default as BottomSheet } from './BottomSheet';
export type { BottomSheetProps } from './BottomSheet';

// Инструкция по добавлению новых компонентов:
// 1. Создайте компонент в папке web/src/components/ui/
// 2. Создайте соответствующий CSS файл с префиксом компонента
// 3. Экспортируйте компонент из этого файла index.ts
// 4. Используйте префикс 'ui-' для всех CSS классов
// 5. Поддерживайте пропсы для кастомизации (className, disabled, и т.д.)
// 6. Используйте Telegram theme переменные для цветов (var(--tg-theme-*))
