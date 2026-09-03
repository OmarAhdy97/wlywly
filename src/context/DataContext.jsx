import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { syncSessionToGoogleCalendar } from '../lib/googleCalendar';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [team, setTeam] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);
  const [bailiffTasks, setBailiffTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCases = useCallback(async () => {
    if (!user) {
      setCases([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      console.error('Error fetching cases for lawyer:', err);
    }
  }, [user]);

  const fetchClients = useCallback(async () => {
    if (!user) {
      setClients([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients for lawyer:', err);
    }
  }, [user]);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: true });
      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions for lawyer:', err);
    }
  }, [user]);

  const fetchTeam = useCallback(async () => {
    if (!user) {
      setTeam([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      setTeam(data || []);
    } catch (err) {
      console.error('Error fetching team for lawyer:', err);
    }
  }, [user]);

  const fetchAdminTasks = useCallback(async () => {
    if (!user) {
      setAdminTasks([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setAdminTasks(data);
        localStorage.setItem(`admin_tasks_${user.id}`, JSON.stringify(data));
        return;
      }
    } catch (err) {
      // fallback
    }

    try {
      const saved = localStorage.getItem(`admin_tasks_${user.id}`);
      if (saved) {
        setAdminTasks(JSON.parse(saved));
      } else {
        setAdminTasks([]);
      }
    } catch (e) {
      setAdminTasks([]);
    }
  }, [user]);

  const fetchBailiffTasks = useCallback(async () => {
    if (!user) {
      setBailiffTasks([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bailiff_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setBailiffTasks(data);
        localStorage.setItem(`bailiff_tasks_${user.id}`, JSON.stringify(data));
        return;
      }
    } catch (err) {
      // fallback
    }

    try {
      const saved = localStorage.getItem(`bailiff_tasks_${user.id}`);
      if (saved) {
        setBailiffTasks(JSON.parse(saved));
      } else {
        setBailiffTasks([]);
      }
    } catch (e) {
      setBailiffTasks([]);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setCases([]);
      setClients([]);
      setSessions([]);
      setTeam([]);
      setAdminTasks([]);
      setBailiffTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([fetchCases(), fetchClients(), fetchSessions(), fetchTeam(), fetchAdminTasks(), fetchBailiffTasks()]);
    setLoading(false);
  }, [user, fetchCases, fetchClients, fetchSessions, fetchTeam]);

  useEffect(() => {
    refreshAll();

    if (user) {
      const interval = setInterval(refreshAll, 10000);
      return () => clearInterval(interval);
    }
  }, [user, refreshAll]);

  // Case Actions with Automatic Google Calendar Background Sync
  const addCase = async (newCase) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const caseData = { ...newCase, user_id: user.id };
    const { data, error } = await supabase.from('cases').insert([caseData]).select();
    if (error) throw error;

    // Automatic Google Calendar sync if session date is provided
    if (newCase.next_session_date && data && data[0]) {
      syncSessionToGoogleCalendar(
        { session_date: newCase.next_session_date, session_time: newCase.next_session_time || '09:00', notes: newCase.notes },
        data[0]
      ).catch(e => console.log('Auto-sync notice:', e));
    }

    await refreshAll();
    return data;
  };

  const updateCase = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const { data, error } = await supabase
      .from('cases')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
    if (error) throw error;

    // Automatic Google Calendar sync if new session date set
    if (updates.next_session_date && data && data[0]) {
      syncSessionToGoogleCalendar(
        { session_date: updates.next_session_date, session_time: updates.next_session_time || '09:00', notes: updates.notes },
        data[0]
      ).catch(e => console.log('Auto-sync notice:', e));
    }

    await refreshAll();
    return data;
  };

  const deleteCase = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await refreshAll();
  };

  // Client Actions
  const addClient = async (newClient) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const clientData = { ...newClient, user_id: user.id };
    const { data, error } = await supabase.from('clients').insert([clientData]).select();
    if (error) throw error;
    await refreshAll();
    return data;
  };

  const updateClient = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
    if (error) throw error;
    await refreshAll();
    return data;
  };

  const deleteClient = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await refreshAll();
  };

  // Session Actions with Automatic Google Calendar Background Sync
  const addSession = async (sessionData, caseUpdates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const sessionWithUser = { ...sessionData, user_id: user.id };
    const { data, error } = await supabase.from('sessions').insert([sessionWithUser]).select();
    if (error) throw error;

    if (caseUpdates && sessionData.case_id) {
      const { data: updatedCaseData } = await supabase
        .from('cases')
        .update(caseUpdates)
        .eq('id', sessionData.case_id)
        .eq('user_id', user.id)
        .select();

      if (updatedCaseData && updatedCaseData[0]) {
        syncSessionToGoogleCalendar(sessionData, updatedCaseData[0]).catch(e => console.log('Auto-sync notice:', e));
      }
    }
    await refreshAll();
    return data;
  };

  // Team Actions
  const addTeamMember = async (member) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const memberWithUser = { ...member, user_id: user.id };
    const { data, error } = await supabase.from('team_members').insert([memberWithUser]).select();
    if (error) throw error;
    await refreshAll();
    return data;
  };

  const updateTeamMember = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
    if (error) throw error;
    await refreshAll();
    return data;
  };

  const deleteTeamMember = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await refreshAll();
  };

  // Administrative Tasks Actions
  const addAdminTask = async (taskData) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const newTask = {
      id: taskData.id || `task_${Date.now()}`,
      user_id: user.id,
      title: taskData.title,
      client_id: taskData.client_id || null,
      client_name: taskData.client_name || null,
      execution_date: taskData.execution_date || new Date().toISOString().split('T')[0],
      location: taskData.location || null,
      requirements: taskData.requirements || '',
      notes: taskData.notes || '',
      assigned_to: taskData.assigned_to || null,
      status: taskData.status || 'pending', // 'pending' (قيد التنفيذ) | 'completed' (مكتمل)
      created_at: new Date().toISOString(),
      ...taskData,
    };

    // Try Supabase first
    try {
      await supabase.from('admin_tasks').insert([newTask]);
    } catch (e) {
      // fallback to local storage
    }

    setAdminTasks(prev => {
      const updated = [newTask, ...prev];
      localStorage.setItem(`admin_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    return newTask;
  };

  const updateAdminTask = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase
        .from('admin_tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      // ignore
    }

    setAdminTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem(`admin_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAdminTaskStatus = async (id) => {
    const current = adminTasks.find(t => t.id === id);
    if (!current) return;
    const nextStatus = current.status === 'completed' ? 'pending' : 'completed';
    await updateAdminTask(id, { status: nextStatus, completed_at: nextStatus === 'completed' ? new Date().toISOString() : null });
  };

  const deleteAdminTask = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase
        .from('admin_tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      // ignore
    }

    setAdminTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(`admin_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Bailiff Tasks (قائمة المحضرين) Actions
  const addBailiffTask = async (taskData) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const newTask = {
      id: taskData.id || `bailiff_${Date.now()}`,
      user_id: user.id,
      client_id: taskData.client_id || null,
      client_name: taskData.client_name || null,
      notice_nature: taskData.notice_nature || '', // طبيعة الإعلان
      bailiff_number: taskData.bailiff_number || '', // رقم المحضرين
      court_name: taskData.court_name || '', // المحكمة
      bailiff_office: taskData.bailiff_office || '', // قلم المحضرين
      delivery_date: taskData.delivery_date || new Date().toISOString().split('T')[0], // تاريخ التسليم
      receipt_date: taskData.receipt_date || null, // تاريخ الاستلام
      session_date: taskData.session_date || null, // تاريخ الجلسة
      notes: taskData.notes || '',
      status: taskData.status || 'pending', // 'pending' (غير مستلم) | 'delivered' (مستلم)
      created_at: new Date().toISOString(),
      ...taskData,
    };

    try {
      await supabase.from('bailiff_tasks').insert([newTask]);
    } catch (e) {
      // fallback
    }

    setBailiffTasks(prev => {
      const updated = [newTask, ...prev];
      localStorage.setItem(`bailiff_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    return newTask;
  };

  const updateBailiffTask = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase
        .from('bailiff_tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      // ignore
    }

    setBailiffTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem(`bailiff_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleBailiffStatus = async (id) => {
    const current = bailiffTasks.find(t => t.id === id);
    if (!current) return;
    const nextStatus = current.status === 'delivered' ? 'pending' : 'delivered';
    const updates = {
      status: nextStatus,
      receipt_date: nextStatus === 'delivered' ? (current.receipt_date || new Date().toISOString().split('T')[0]) : null
    };
    await updateBailiffTask(id, updates);
  };

  const deleteBailiffTask = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase
        .from('bailiff_tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      // ignore
    }

    setBailiffTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(`bailiff_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <DataContext.Provider
      value={{
        cases,
        clients,
        sessions,
        team,
        adminTasks,
        bailiffTasks,
        loading,
        error,
        refreshAll,
        addCase,
        updateCase,
        deleteCase,
        addClient,
        updateClient,
        deleteClient,
        addSession,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        addAdminTask,
        updateAdminTask,
        deleteAdminTask,
        toggleAdminTaskStatus,
        addBailiffTask,
        updateBailiffTask,
        deleteBailiffTask,
        toggleBailiffStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
