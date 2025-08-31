import * as React from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  required?: boolean;
}

export default function CustomDatePicker({ value, onChange, label, required = false }: CustomDatePickerProps) {
  const handleDateChange = (newValue: Dayjs | null) => {
    if (newValue) {
      onChange(newValue.format('YYYY-MM-DD'));
    } else {
      onChange('');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer components={['DatePicker']}>
        <DatePicker 
          label={label}
          value={value ? dayjs(value) : null}
          onChange={handleDateChange}
          slotProps={{
            textField: {
              size: 'small',
              required,
              fullWidth: true,
              sx: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  color: 'inherit',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '& input': {
                    color: 'inherit',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'inherit',
                  '&.Mui-focused': {
                    color: 'inherit',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'inherit',
                },
              },
            },
            popper: {
              sx: {
                '& .MuiPaper-root': {
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                },
                '& .MuiPickersDay-root': {
                  color: 'white',
                  '&.Mui-selected': {
                    backgroundColor: '#3b82f6',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                },
                '& .MuiPickersCalendarHeader-root': {
                  color: 'white',
                },
              },
            },
          }}
        />
      </DemoContainer>
    </LocalizationProvider>
  );
}
