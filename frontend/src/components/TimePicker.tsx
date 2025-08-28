import * as React from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';

interface CustomTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
  required?: boolean;
}

export default function CustomTimePicker({ value, onChange, label, required = false }: CustomTimePickerProps) {
  const handleTimeChange = (newValue: Dayjs | null) => {
    if (newValue) {
      onChange(newValue.format('HH:mm'));
    } else {
      onChange('');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer components={['TimePicker']}>
        <TimePicker 
          label={label}
          value={value ? dayjs(`2000-01-01T${value}`) : null}
          onChange={handleTimeChange}
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
                '& .MuiClock-root': {
                  color: 'white',
                },
                '& .MuiClockNumber-root': {
                  color: 'white',
                  '&.Mui-selected': {
                    backgroundColor: '#3b82f6',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                },
                '& .MuiClockPointer-root': {
                  backgroundColor: '#3b82f6',
                },
              },
            },
          }}
        />
      </DemoContainer>
    </LocalizationProvider>
  );
}
