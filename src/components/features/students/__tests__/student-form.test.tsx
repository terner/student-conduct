// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { StudentForm } from '@/components/features/students/student-form';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/actions/student.action', () => ({
  getAcademicYears: vi.fn(async () => ({
    success: true,
    data: [{ id: 'year-1', name: '2569', is_current: true }],
  })),
  getClassroomsForSelect: vi.fn(async () => ({
    success: true,
    data: [],
  })),
}));

vi.mock('@/lib/actions/education-stage.action', () => ({
  getEducationStages: vi.fn(async () => ({
    success: true,
    data: [{ id: 'stage-1', name_th: 'ประถมศึกษา' }],
  })),
}));

vi.mock('@/components/ui/select', async () => {
  const React = await import('react');

  type ExtractedItem = { value: string; label: string };

  const SelectItem = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectValue = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  function extract(children: React.ReactNode, result: { items: ExtractedItem[]; placeholder?: string }) {
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as {
        value?: string;
        label?: string;
        placeholder?: string;
        children?: React.ReactNode;
      };

      if (child.type === SelectItem) {
        const label = String(props.label ?? props.children ?? props.value ?? '');
        result.items.push({ value: String(props.value ?? ''), label });
        return;
      }

      if (child.type === SelectValue && props.placeholder && !result.placeholder) {
        result.placeholder = String(props.placeholder);
      }

      if (props.children) {
        extract(props.children, result);
      }
    });
  }

  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string | null;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }) {
    const extracted = { items: [] as ExtractedItem[], placeholder: undefined as string | undefined };
    extract(children, extracted);

    return (
      <select
        aria-label={extracted.placeholder || 'select'}
        data-placeholder={extracted.placeholder || ''}
        disabled={disabled}
        value={value ?? ''}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="">{extracted.placeholder || ''}</option>
        {extracted.items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

const classrooms = [
  {
    id: 'classroom-1',
    name: '1/1',
    grade_level_id: 'grade-1',
    grade_level_name: 'ป.1',
    grade_level: 1,
    education_stage_id: 'stage-1',
    academic_year_id: 'year-1',
  },
];

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function getInput(container: HTMLElement, selector: string): HTMLInputElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected input for selector: ${selector}`);
  }
  return element;
}

function getSelectByOption(container: HTMLElement, optionValue: string): HTMLSelectElement {
  const select = Array.from(container.querySelectorAll('select')).find((element) =>
    Array.from(element.querySelectorAll('option')).some((option) => option.value === optionValue),
  );

  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Expected select containing option value: ${optionValue}`);
  }

  return select;
}

async function setFieldValue(field: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('StudentForm', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it('submits successfully when class number is greater than 50', async () => {
    const onSubmit = vi.fn(async () => ({}));

    await act(async () => {
      root.render(<StudentForm classrooms={classrooms} onSubmit={onSubmit} />);
    });

    await flushPromises();
    await flushPromises();

    await setFieldValue(getInput(container, 'input[placeholder="firstName"]'), 'ธนพล');
    await setFieldValue(getInput(container, 'input[placeholder="lastName"]'), 'ใจดี');
    await setFieldValue(getInput(container, '#student_id_number'), '123456');
    await setFieldValue(getInput(container, '#class_number'), '51');
    await setFieldValue(getSelectByOption(container, 'grade-1'), 'grade-1');
    await setFieldValue(getSelectByOption(container, 'classroom-1'), 'classroom-1');

    await act(async () => {
      const form = container.querySelector('form');
      if (!(form instanceof HTMLFormElement)) throw new Error('Expected form element');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'ธนพล',
      last_name: 'ใจดี',
      student_id_number: '123456',
      classroom_id: 'classroom-1',
      class_number: 51,
      guardian_first_name: '',
      guardian_last_name: '',
      guardian_phone: '',
    }));
  });

  it('allows submitting with guardian fields left blank', async () => {
    const onSubmit = vi.fn(async () => ({}));

    await act(async () => {
      root.render(<StudentForm classrooms={classrooms} onSubmit={onSubmit} />);
    });

    await flushPromises();
    await flushPromises();

    await setFieldValue(getInput(container, 'input[placeholder="firstName"]'), 'สมชาย');
    await setFieldValue(getInput(container, 'input[placeholder="lastName"]'), 'เรียนดี');
    await setFieldValue(getInput(container, '#student_id_number'), '999');
    await setFieldValue(getInput(container, '#class_number'), '80');
    await setFieldValue(getSelectByOption(container, 'grade-1'), 'grade-1');
    await setFieldValue(getSelectByOption(container, 'classroom-1'), 'classroom-1');

    await act(async () => {
      const form = container.querySelector('form');
      if (!(form instanceof HTMLFormElement)) throw new Error('Expected form element');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      guardian_prefix: '',
      guardian_first_name: '',
      guardian_last_name: '',
      guardian_phone: '',
    }));
  });
});
