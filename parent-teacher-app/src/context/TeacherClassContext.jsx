import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { API_URL } from '@/constants/api';

export const TeacherClassContext = createContext({
  classes: [],
  selectedClass: null,
  setSelectedClass: () => {},
  loading: true,
  refreshClasses: async () => {},
});

export const TeacherClassProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      if (classes.length === 0) {
        setLoading(true);
      }
      const response = await fetch(`${API_URL}/teacher/get_my_classes.php`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data);
          // Preserve currently selected class if still valid, otherwise default to first class
          setSelectedClass((prev) => {
            if (prev) {
              const match = data.find((c) => c.id === prev.id);
              if (match) return match;
            }
            return data[0];
          });
        } else {
          setClasses([]);
          setSelectedClass(null);
        }
      } else {
        setClasses([]);
        setSelectedClass(null);
      }
    } catch (err) {
      console.log('TeacherClassContext fetch error:', err.message);
      setClasses([]);
      setSelectedClass(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [token, user]);

  return (
    <TeacherClassContext.Provider
      value={{
        classes,
        selectedClass,
        setSelectedClass,
        loading,
        refreshClasses: fetchClasses,
      }}
    >
      {children}
    </TeacherClassContext.Provider>
  );
};
