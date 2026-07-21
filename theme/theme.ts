export type Theme = {
  dark: boolean;
  colors: {
    background: string;
    card: string;
    surface: string;
    border: string;
    text: string;
    secondaryText: string;
    primary: string;
    disabled: string;
  };
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E7E5E4',
    text: '#000000',
    secondaryText: '#666666',
    primary: '#1C1917', // Vyra's classic Onyx
    disabled: '#A8A29E',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#121212',
    card: '#1B1B1B',
    surface: '#242424',
    border: '#2E2E2E',
    text: '#F4F4F4',
    secondaryText: '#B8B8B8',
    primary: '#F4F4F4', // In dark mode, our primary branding color shifts to light for contrast
    disabled: '#666666',
  },
};
