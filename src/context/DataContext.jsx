import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, USER_ROLES } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { syncSessionToGoogleCalendar } from '../lib/googleCalendar';
import { notifyClientOfCaseUpdate } from '../lib/telegram';

const DataContext = createContext(null);

export const DEFAULT_OFFICE_PROFILE = {
  office_name: 'مكتب المحاماة والاستشارات القانونية',
  lawyer_name: '',
  lawyer_title: 'محامون ومستشارون قانونيون',
  slogan: 'الالتزام .. خبرة .. نتائج',
  phone: '',
  email: '',
  address: '',
  logo_url: null,
};

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [team, setTeam] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);
  const [adminTaskUpdates, setAdminTaskUpdates] = useState([]);
  const [bailiffTasks, setBailiffTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [officeProfile, setOfficeProfile] = useState(() => {
    if (user) {
      try {
        const saved = localStorage.getItem(`office_profile_${user.id}`);
        if (saved) return { ...DEFAULT_OFFICE_PROFILE, ...JSON.parse(saved) };
      } catch (e) { }
    }
    return DEFAULT_OFFICE_PROFILE;
  });
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

  const fetchAdminTaskUpdates = useCallback(async () => {
    if (!user) {
      setAdminTaskUpdates([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('admin_task_updates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAdminTaskUpdates(data);
        localStorage.setItem(`admin_task_updates_${user.id}`, JSON.stringify(data));
        return;
      }
    } catch (err) {
      // fallback
    }

    try {
      const saved = localStorage.getItem(`admin_task_updates_${user.id}`);
      if (saved) {
        setAdminTaskUpdates(JSON.parse(saved));
      } else {
        setAdminTaskUpdates([]);
      }
    } catch (e) {
      setAdminTaskUpdates([]);
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

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('client_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!error && data) {
        setTransactions(data);
        localStorage.setItem(`client_transactions_${user.id}`, JSON.stringify(data));
        return;
      }
    } catch (err) {
      // fallback
    }

    try {
      const saved = localStorage.getItem(`client_transactions_${user.id}`);
      if (saved) {
        setTransactions(JSON.parse(saved));
      } else {
        setTransactions([]);
      }
    } catch (e) {
      setTransactions([]);
    }
  }, [user]);

  const fetchAppeals = useCallback(async () => {
    if (!user) {
      setAppeals([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('appeals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAppeals(data);
        localStorage.setItem(`appeals_${user.id}`, JSON.stringify(data));
        return;
      }
    } catch (err) {
      // fallback
    }

    try {
      const saved = localStorage.getItem(`appeals_${user.id}`);
      setAppeals(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setAppeals([]);
    }
  }, [user]);

  const fetchAgendaEvents = useCallback(async () => {
    if (!user) {
      setAgendaEvents([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (!error && data) {
        setAgendaEvents(data);
        localStorage.setItem(`agenda_events_${user.id}`, JSON.stringify(data));
        return;
      }
    } catch (err) {
      // fallback
    }

    try {
      const saved = localStorage.getItem(`agenda_events_${user.id}`);
      setAgendaEvents(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setAgendaEvents([]);
    }
  }, [user]);

  const fetchOfficeProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('office_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const merged = { ...DEFAULT_OFFICE_PROFILE, ...data };
        setOfficeProfile(prev => {
          const keys = Object.keys(merged);
          const isIdentical = prev && keys.every(k => prev[k] === merged[k]);
          if (isIdentical) return prev;
          return merged;
        });
        localStorage.setItem(`office_profile_${user.id}`, JSON.stringify(merged));
        return;
      }
    } catch (err) { }

    try {
      const saved = localStorage.getItem(`office_profile_${user.id}`);
      let profileToSave = null;

      if (saved) {
        profileToSave = { ...DEFAULT_OFFICE_PROFILE, ...JSON.parse(saved), user_id: user.id };
      } else {
        const lawyerName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
        const roleKey = user?.user_metadata?.role;
        const lawyerTitle = user?.user_metadata?.lawyer_title || USER_ROLES[roleKey] || DEFAULT_OFFICE_PROFILE.lawyer_title;
        const officeName = user?.user_metadata?.office_name || (lawyerName
          ? (lawyerName.includes('مكتب') ? lawyerName : `مكتب الأستاذ / ${lawyerName} للمحاماة والاستشارات القانونية`)
          : DEFAULT_OFFICE_PROFILE.office_name);
        const phone = user?.user_metadata?.phone || '';
        const email = user?.email || '';
        const address = user?.user_metadata?.address || '';

        profileToSave = {
          ...DEFAULT_OFFICE_PROFILE,
          user_id: user.id,
          lawyer_name: lawyerName,
          lawyer_title: lawyerTitle,
          office_name: officeName,
          phone: phone,
          email: email,
          address: address,
          updated_at: new Date().toISOString(),
        };
      }

      setOfficeProfile(prev => {
        const keys = Object.keys(profileToSave);
        const isIdentical = prev && keys.every(k => prev[k] === profileToSave[k]);
        if (isIdentical) return prev;
        return profileToSave;
      });
      localStorage.setItem(`office_profile_${user.id}`, JSON.stringify(profileToSave));

      // Persist to Supabase office_profile table in database safely
      try {
        const { data: existing } = await supabase
          .from('office_profile')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existing) {
          const { error: insErr } = await supabase
            .from('office_profile')
            .insert([profileToSave]);
          if (insErr) {
            await supabase
              .from('office_profile')
              .upsert([profileToSave], { onConflict: 'user_id' });
          }
        }
      } catch (dbErr) {
        console.log('Notice: auto-syncing office_profile to database:', dbErr);
      }
    } catch (e) {
      console.log('Error initializing office profile:', e);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setCases([]);
      setClients([]);
      setSessions([]);
      setTeam([]);
      setAdminTasks([]);
      setAdminTaskUpdates([]);
      setBailiffTasks([]);
      setTransactions([]);
      setAppeals([]);
      setAgendaEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([
      fetchCases(),
      fetchClients(),
      fetchSessions(),
      fetchTeam(),
      fetchAdminTasks(),
      fetchAdminTaskUpdates(),
      fetchBailiffTasks(),
      fetchTransactions(),
      fetchAppeals(),
      fetchAgendaEvents(),
      fetchOfficeProfile()
    ]);
    setLoading(false);
  }, [user, fetchCases, fetchClients, fetchSessions, fetchTeam, fetchAdminTasks, fetchAdminTaskUpdates, fetchBailiffTasks, fetchTransactions, fetchAppeals, fetchAgendaEvents, fetchOfficeProfile]);

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

    // Automatic Telegram notification if status or session date updated
    if (data && data[0] && data[0].client_id && (updates.status || updates.next_session_date || updates.ruling_text)) {
      const clientItem = clients.find(c => c.id === data[0].client_id);
      if (clientItem?.telegram_chat_id) {
        notifyClientOfCaseUpdate({
          client: clientItem,
          caseItem: data[0],
          updateType: updates.status,
          lawyerUser: user,
          sessionData: {
            status: updates.status,
            next_session_date: updates.next_session_date,
            notes: updates.notes,
            ruling_text: updates.ruling_text,
          }
        }).catch(e => console.log('Telegram auto-notify on case update:', e));
      }
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

  // Session Actions with Automatic Google Calendar & Telegram Sync
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

        // Automatic Telegram notification to client
        const clientId = updatedCaseData[0].client_id;
        if (clientId) {
          const clientItem = clients.find(c => c.id === clientId);
          if (clientItem?.telegram_chat_id) {
            notifyClientOfCaseUpdate({
              client: clientItem,
              caseItem: updatedCaseData[0],
              updateType: sessionData.status || caseUpdates.status,
              lawyerUser: user,
              sessionData: sessionData,
            }).catch(e => console.log('Telegram session auto-notify error:', e));
          }
        }
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
      status: taskData.status || 'pending', // 'pending', 'in_progress', 'postponed', 'waiting', 'completed', 'cancelled'
      created_at: new Date().toISOString(),
      ...taskData,
    };

    // 1. Try Supabase first for current state
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

    // 2. Create Initial Audit History Record (Idempotent)
    const initialUpdate = {
      id: `upd_init_${newTask.id}`,
      user_id: user.id,
      admin_task_id: newTask.id,
      case_id: newTask.case_id || null,
      action_type: 'created',
      previous_status: null,
      new_status: newTask.status || 'pending',
      previous_due_date: null,
      new_due_date: newTask.execution_date || null,
      previous_assigned_to: null,
      new_assigned_to: newTask.assigned_to || null,
      update_text: newTask.requirements || newTask.notes || 'تم إنشاء العمل الإداري وتحديد بياناته الأولية',
      created_by: user.id,
      created_at: newTask.created_at || new Date().toISOString(),
    };

    try {
      await supabase.from('admin_task_updates').insert([initialUpdate]);
    } catch (e) {
      // fallback
    }

    setAdminTaskUpdates(prev => {
      const exists = prev.some(u => u.admin_task_id === newTask.id && u.action_type === 'created');
      if (exists) return prev;
      const updated = [initialUpdate, ...prev];
      localStorage.setItem(`admin_task_updates_${user.id}`, JSON.stringify(updated));
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

  const updateAdminTaskWorkflow = async ({
    taskId,
    newStatus,
    updateText,
    newDueDate,
    isDueDateCleared,
    newAssignedTo,
  }) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const currentTask = adminTasks.find(t => t.id === taskId);
    if (!currentTask) throw new Error('العمل الإداري غير موجود');

    const previousStatus = currentTask.status || 'pending';
    const previousDueDate = currentTask.execution_date ? currentTask.execution_date.split('T')[0] : null;
    const previousAssignedTo = currentTask.assigned_to || null;

    // Resolve date explicitly (distinguishing unchanged vs changed vs cleared)
    let resolvedDueDate = previousDueDate;
    if (isDueDateCleared) {
      resolvedDueDate = null;
    } else if (newDueDate !== undefined) {
      resolvedDueDate = newDueDate ? newDueDate.split('T')[0] : null;
    }

    // Resolve assigned_to explicitly
    const resolvedAssignedTo = newAssignedTo !== undefined ? (newAssignedTo || null) : previousAssignedTo;

    // Resolve status
    const resolvedStatus = newStatus || previousStatus;

    // Determine primary action_type
    let actionType = 'updated';
    if (resolvedStatus === 'postponed' && (previousDueDate !== resolvedDueDate || previousStatus !== 'postponed')) {
      actionType = 'postponed';
    } else if (resolvedStatus === 'completed' && previousStatus !== 'completed') {
      actionType = 'completed';
    } else if (previousStatus === 'completed' && resolvedStatus !== 'completed') {
      actionType = 'reopened';
    } else if (resolvedStatus === 'cancelled' && previousStatus !== 'cancelled') {
      actionType = 'cancelled';
    } else if (previousAssignedTo !== resolvedAssignedTo) {
      actionType = 'reassigned';
    } else if (previousDueDate !== resolvedDueDate) {
      actionType = 'due_date_changed';
    } else if (previousStatus !== resolvedStatus) {
      actionType = 'status_changed';
    } else if (updateText) {
      actionType = 'note_added';
    }

    // 1. Update admin_tasks (Current State)
    const taskUpdates = {
      status: resolvedStatus,
      execution_date: resolvedDueDate,
      assigned_to: resolvedAssignedTo,
      updated_at: new Date().toISOString(),
    };

    if (resolvedStatus === 'completed') {
      taskUpdates.completed_at = new Date().toISOString();
      taskUpdates.completed_by = user.id;
    } else if (previousStatus === 'completed' && resolvedStatus !== 'completed') {
      taskUpdates.completed_at = null;
      taskUpdates.completed_by = null;
    }

    try {
      await supabase
        .from('admin_tasks')
        .update(taskUpdates)
        .eq('id', taskId)
        .eq('user_id', user.id);
    } catch (e) {
      // fallback
    }

    setAdminTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, ...taskUpdates } : t);
      localStorage.setItem(`admin_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    // 2. Insert into admin_task_updates (Audit History)
    const historyRecord = {
      id: `upd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: user.id,
      admin_task_id: taskId,
      case_id: currentTask.case_id || null,
      action_type: actionType,
      previous_status: previousStatus,
      new_status: resolvedStatus,
      previous_due_date: previousDueDate,
      new_due_date: resolvedDueDate,
      previous_assigned_to: previousAssignedTo,
      new_assigned_to: resolvedAssignedTo,
      update_text: updateText || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('admin_task_updates').insert([historyRecord]);
    } catch (e) {
      // fallback
    }

    setAdminTaskUpdates(prev => {
      const updated = [historyRecord, ...prev];
      localStorage.setItem(`admin_task_updates_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    // 3. Agenda Events synchronization (Do NOT touch case.next_session_date)
    try {
      const existingEvent = (agendaEvents || []).find(
        ev => ev.source_id === taskId && ev.event_type === 'administrative_task'
      );

      if (resolvedStatus === 'completed' || resolvedStatus === 'cancelled' || !resolvedDueDate) {
        if (existingEvent) {
          await updateAgendaEvent(existingEvent.id, {
            status: resolvedStatus === 'completed' ? 'completed' : 'cancelled'
          });
        }
      } else if (resolvedDueDate) {
        if (existingEvent) {
          await updateAgendaEvent(existingEvent.id, {
            event_date: resolvedDueDate,
            status: 'scheduled',
            details: updateText || currentTask.requirements || currentTask.notes || ''
          });
        } else {
          await addAgendaEvent({
            id: `ev_task_${Date.now()}`,
            user_id: user.id,
            case_id: currentTask.case_id || null,
            event_type: 'administrative_task',
            title: currentTask.title,
            event_date: resolvedDueDate,
            event_time: '09:00',
            source_id: taskId,
            details: updateText || currentTask.requirements || currentTask.notes || '',
            status: 'scheduled',
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.log('Notice: Agenda event sync skipped:', err);
    }

    return { taskUpdates, historyRecord };
  };

  const toggleAdminTaskStatus = async (id) => {
    const current = adminTasks.find(t => t.id === id);
    if (!current) return;
    const isCurrentlyDone = current.status === 'completed';
    const nextStatus = isCurrentlyDone ? 'in_progress' : 'completed';
    const note = isCurrentlyDone ? 'تمت إعادة العمل الإداري للتنفيذ والمتابعة' : 'تم إتمام العمل الإداري بنجاح';
    await updateAdminTaskWorkflow({
      taskId: id,
      newStatus: nextStatus,
      updateText: note,
    });
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

    try {
      await supabase
        .from('admin_task_updates')
        .delete()
        .eq('admin_task_id', id)
        .eq('user_id', user.id);
    } catch (e) {
      // ignore
    }

    setAdminTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(`admin_tasks_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    setAdminTaskUpdates(prev => {
      const updated = prev.filter(u => u.admin_task_id !== id);
      localStorage.setItem(`admin_task_updates_${user.id}`, JSON.stringify(updated));
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

  // Client Financial Transactions (Statement of Account & Ledger)
  const addTransaction = async (txData) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const numAmount = Math.abs(parseFloat(txData.amount)) || 0;
    if (numAmount <= 0) throw new Error('يرجى إدخال مبلغ صحيح أكبر من الصفر');

    const newTx = {
      id: txData.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      client_id: txData.client_id,
      case_id: txData.case_id || null,
      type: txData.type, // 'expense' (مصروف/أتعاب على الموكل) or 'payment' (سداد/تحصيل من الموكل)
      amount: numAmount,
      description: txData.description || (txData.type === 'expense' ? 'مصروف قضائي / أتعاب' : 'دفعة سداد نقدية'),
      date: txData.date || new Date().toISOString().split('T')[0],
      user_id: user.id,
      created_at: new Date().toISOString(),
    };

    // Try Supabase insert
    try {
      await supabase.from('client_transactions').insert([newTx]);
    } catch (e) {
      // Table may not exist yet, fallback to localStorage
    }

    // Save in state & localStorage
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      localStorage.setItem(`client_transactions_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    // Automatically recalculate and adjust client financial_balance
    const targetClient = clients.find(c => c.id === txData.client_id);
    if (targetClient) {
      const currentBalance = parseFloat(targetClient.financial_balance) || 0;
      // Expense increases debt (more negative), Payment reduces debt (more positive)
      const balanceDelta = txData.type === 'expense' ? -numAmount : numAmount;
      const updatedBalance = currentBalance + balanceDelta;
      await updateClient(txData.client_id, { financial_balance: updatedBalance });
    }

    return newTx;
  };

  const deleteTransaction = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const txToDelete = transactions.find(t => t.id === id);

    try {
      await supabase.from('client_transactions').delete().eq('id', id).eq('user_id', user.id);
    } catch (e) {
      // ignore
    }

    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(`client_transactions_${user.id}`, JSON.stringify(updated));
      return updated;
    });

    // Reverse balance adjustment on client
    if (txToDelete) {
      const targetClient = clients.find(c => c.id === txToDelete.client_id);
      if (targetClient) {
        const currentBalance = parseFloat(targetClient.financial_balance) || 0;
        // Reversal: if it was an expense, subtract the debt (- -amount = +amount); if payment, add back debt (-amount)
        const balanceDelta = txToDelete.type === 'expense' ? txToDelete.amount : -txToDelete.amount;
        const updatedBalance = currentBalance + balanceDelta;
        await updateClient(txToDelete.client_id, { financial_balance: updatedBalance });
      }
    }
  };

  const updateOfficeProfile = async (updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');

    // 1. Clean payload matching office_profile columns exactly
    const cleanProfile = {
      user_id: user.id,
      office_name: updates.office_name !== undefined ? updates.office_name : (officeProfile.office_name || ''),
      lawyer_name: updates.lawyer_name !== undefined ? updates.lawyer_name : (officeProfile.lawyer_name || ''),
      lawyer_title: updates.lawyer_title !== undefined ? updates.lawyer_title : (officeProfile.lawyer_title || ''),
      slogan: updates.slogan !== undefined ? updates.slogan : (officeProfile.slogan || ''),
      phone: updates.phone !== undefined ? updates.phone : (officeProfile.phone || ''),
      email: updates.email !== undefined ? updates.email : (officeProfile.email || user.email || ''),
      address: updates.address !== undefined ? updates.address : (officeProfile.address || ''),
      logo_url: updates.logo_url !== undefined ? updates.logo_url : (officeProfile.logo_url || null),
      updated_at: new Date().toISOString()
    };

    const fullProfile = { ...officeProfile, ...cleanProfile };
    setOfficeProfile(fullProfile);
    localStorage.setItem(`office_profile_${user.id}`, JSON.stringify(fullProfile));

    // 2. Update Supabase Auth user_metadata so all app components reading from user.user_metadata stay in sync
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: cleanProfile.lawyer_name,
          name: cleanProfile.lawyer_name,
          office_name: cleanProfile.office_name,
          lawyer_title: cleanProfile.lawyer_title,
          phone: cleanProfile.phone,
          address: cleanProfile.address,
          slogan: cleanProfile.slogan,
        }
      });
    } catch (authErr) {
      console.warn('Notice: Updating auth user_metadata failed:', authErr);
    }

    // 3. Persist to Supabase office_profile table (check if row exists -> update, else insert/upsert)
    let dbError = null;
    try {
      const { data: existingRow, error: checkError } = await supabase
        .from('office_profile')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRow && existingRow.id) {
        const { error: updateError } = await supabase
          .from('office_profile')
          .update(cleanProfile)
          .eq('id', existingRow.id)
          .eq('user_id', user.id);
        if (updateError) dbError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('office_profile')
          .insert([cleanProfile]);

        if (insertError) {
          // Fallback to upsert if insert had conflict
          const { error: upsertError } = await supabase
            .from('office_profile')
            .upsert([cleanProfile], { onConflict: 'user_id' });
          if (upsertError) dbError = upsertError;
        }
      }
    } catch (err) {
      dbError = err;
    }

    if (dbError) {
      console.error('Error persisting office_profile to database:', dbError);
      throw new Error(dbError.message || 'فشل حفظ البيانات في قاعدة البيانات');
    }

    return fullProfile;
  };

  // Appeal Actions
  const addAppeal = async (appealData) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const newAppeal = {
      id: appealData.id || `appeal_${Date.now()}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
      ...appealData,
    };
    try {
      await supabase.from('appeals').insert([newAppeal]);
    } catch (e) {}

    setAppeals(prev => {
      const updated = [newAppeal, ...prev.filter(a => a.id !== newAppeal.id)];
      localStorage.setItem(`appeals_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    return newAppeal;
  };

  const updateAppeal = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase.from('appeals').update(updates).eq('id', id).eq('user_id', user.id);
    } catch (e) {}

    setAppeals(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      localStorage.setItem(`appeals_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Agenda Event Actions
  const addAgendaEvent = async (eventData) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const newEvent = {
      id: eventData.id || `event_${Date.now()}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
      ...eventData,
    };
    try {
      await supabase.from('agenda_events').insert([newEvent]);
    } catch (e) {}

    setAgendaEvents(prev => {
      const updated = [newEvent, ...prev.filter(ev => ev.id !== newEvent.id)];
      localStorage.setItem(`agenda_events_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    return newEvent;
  };

  const updateAgendaEvent = async (id, updates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase.from('agenda_events').update(updates).eq('id', id).eq('user_id', user.id);
    } catch (e) {}

    setAgendaEvents(prev => {
      const updated = prev.map(ev => ev.id === id ? { ...ev, ...updates } : ev);
      localStorage.setItem(`agenda_events_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteAgendaEvent = async (id) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    try {
      await supabase.from('agenda_events').delete().eq('id', id).eq('user_id', user.id);
    } catch (e) {}

    setAgendaEvents(prev => {
      const updated = prev.filter(ev => ev.id !== id);
      localStorage.setItem(`agenda_events_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Unified Session Decision Recorder
  const recordSessionDecision = async ({
    caseItem,
    currentSessionData,
    nextSessionData,
    caseUpdates,
    appealData,
    adminTaskData,
    transactionData,
  }) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');

    // 1. Save current session record (historical record of this concluded session)
    const currentSessionWithUser = {
      ...currentSessionData,
      user_id: user.id,
      case_id: caseItem.id,
      created_at: new Date().toISOString(),
    };

    let currentSessionResult = null;
    try {
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert([currentSessionWithUser])
        .select();
      if (!sessErr && sessData && sessData[0]) {
        currentSessionResult = sessData[0];
      }
    } catch (e) {
      console.warn('Supabase session insert fallback:', e);
    }

    // 2. If nextSessionData is provided, create the scheduled court session preventing duplicates
    let nextSessionResult = null;
    if (nextSessionData && nextSessionData.session_date) {
      const nextSessionWithUser = {
        ...nextSessionData,
        user_id: user.id,
        case_id: caseItem.id,
        status: nextSessionData.status || 'scheduled',
        session_time: nextSessionData.session_time || '09:00',
        created_at: new Date().toISOString(),
      };

      // Check if session already exists for this case on this date to prevent duplicates
      const existingSession = sessions.find(s => s.case_id === caseItem.id && s.session_date === nextSessionData.session_date);
      if (existingSession) {
        try {
          await supabase.from('sessions').update(nextSessionWithUser).eq('id', existingSession.id).eq('user_id', user.id);
        } catch (e) {}
      } else {
        try {
          const { data: nextData, error: nextErr } = await supabase
            .from('sessions')
            .insert([nextSessionWithUser])
            .select();
          if (!nextErr && nextData && nextData[0]) {
            nextSessionResult = nextData[0];
          }
        } catch (e) {
          console.warn('Supabase next session insert fallback:', e);
        }
      }
    }

    // 3. Update the case record
    let updatedCaseData = null;
    if (caseUpdates) {
      try {
        const { data: cData, error: cErr } = await supabase
          .from('cases')
          .update(caseUpdates)
          .eq('id', caseItem.id)
          .eq('user_id', user.id)
          .select();
        if (!cErr && cData && cData[0]) {
          updatedCaseData = cData[0];
        }
      } catch (e) {
        console.warn('Supabase case update fallback:', e);
      }
    }

    // 4. If appealData is provided (Final Judgment -> Yes, Appeal)
    if (appealData && appealData.appeal_requested) {
      const newAppeal = {
        id: `appeal_${Date.now()}`,
        user_id: user.id,
        case_id: caseItem.id,
        session_id: currentSessionResult?.id || null,
        judgment_date: appealData.judgment_date,
        judgment_text: appealData.judgment_text || null,
        appeal_requested: true,
        follow_up_date: appealData.follow_up_date,
        appeal_status: 'pending_filing',
        notes: appealData.notes || null,
        created_at: new Date().toISOString(),
      };
      await addAppeal(newAppeal);

      // Add Agenda Event for Appeal Follow-up
      const appealEvent = {
        id: `ev_appeal_${Date.now()}`,
        user_id: user.id,
        case_id: caseItem.id,
        event_type: 'appeal_follow_up',
        title: `متابعة استئناف - دعوى ${caseItem.case_number}/${caseItem.case_year}`,
        event_date: appealData.follow_up_date,
        event_time: '09:00',
        source_id: newAppeal.id,
        details: `ميعاد متابعة قيد الاستئناف لدعوى ${caseItem.case_number}/${caseItem.case_year} — منطوق الحكم: ${appealData.judgment_text || 'حكم نهائي'}`,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      };
      await addAgendaEvent(appealEvent);

      // Sync appeal follow-up to Google Calendar
      syncSessionToGoogleCalendar(
        {
          session_date: appealData.follow_up_date,
          session_time: '09:00',
          judgment_text: appealData.judgment_text,
          event_type: 'appeal_follow_up',
        },
        updatedCaseData || caseItem,
        'appeal_follow_up'
      ).catch(e => console.log('Appeal Google Calendar sync notice:', e));
    }

    // 5. If adminTaskData is provided (Preliminary Judgment)
    if (adminTaskData) {
      const taskPayload = {
        ...adminTaskData,
        case_id: caseItem.id,
        session_id: currentSessionResult?.id || null,
      };
      const createdTask = await addAdminTask(taskPayload);

      // Add Agenda Event for Admin Task if it has an execution date
      if (adminTaskData.execution_date) {
        const taskEvent = {
          id: `ev_task_${Date.now()}`,
          user_id: user.id,
          case_id: caseItem.id,
          event_type: 'administrative_task',
          title: adminTaskData.title || `عمل إداري - دعوى ${caseItem.case_number}/${caseItem.case_year}`,
          event_date: adminTaskData.execution_date,
          event_time: '09:00',
          source_id: createdTask?.id || null,
          details: adminTaskData.requirements || adminTaskData.notes || '',
          status: 'scheduled',
          created_at: new Date().toISOString(),
        };
        await addAgendaEvent(taskEvent);

        // Sync admin task to Google Calendar
        syncSessionToGoogleCalendar(
          {
            session_date: adminTaskData.execution_date,
            session_time: '09:00',
            title: adminTaskData.title,
            requirements: adminTaskData.requirements,
            location: adminTaskData.location,
            notes: adminTaskData.notes,
            event_type: 'administrative_task',
          },
          updatedCaseData || caseItem,
          'administrative_task'
        ).catch(e => console.log('Admin Task Google Calendar sync notice:', e));
      }
    }

    // 6. If transactionData is provided (Session Expense)
    if (transactionData && parseFloat(transactionData.amount) > 0 && caseItem.client_id) {
      await addTransaction(transactionData).catch(e => console.log('Session expense error:', e));
    }

    // 7. Auto Google Calendar Sync if actual court session date is set
    if (caseUpdates?.next_session_date) {
      syncSessionToGoogleCalendar(
        {
          session_date: caseUpdates.next_session_date,
          session_time: caseUpdates.next_session_time || '09:00',
          notes: caseUpdates.notes,
          status: caseUpdates.status || 'scheduled',
        },
        updatedCaseData || caseItem,
        'court_session'
      ).catch(e => console.log('Session Google Calendar sync notice:', e));
    }

    // 8. Auto Telegram Notification if client linked
    const clientId = caseItem.client_id;
    if (clientId) {
      const clientItem = clients.find(c => c.id === clientId);
      if (clientItem?.telegram_chat_id) {
        notifyClientOfCaseUpdate({
          client: clientItem,
          caseItem: updatedCaseData || caseItem,
          updateType: currentSessionData.status || caseUpdates?.status,
          lawyerUser: user,
          sessionData: currentSessionData,
        }).catch(e => console.log('Telegram auto-notify error:', e));
      }
    }

    await refreshAll();
    return { success: true, currentSession: currentSessionResult, nextSession: nextSessionResult, case: updatedCaseData };
  };

  return (
    <DataContext.Provider
      value={{
        cases,
        clients,
        sessions,
        team,
        adminTasks,
        adminTaskUpdates,
        bailiffTasks,
        transactions,
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
        updateAdminTaskWorkflow,
        deleteAdminTask,
        toggleAdminTaskStatus,
        addBailiffTask,
        updateBailiffTask,
        deleteBailiffTask,
        toggleBailiffStatus,
        fetchTransactions,
        addTransaction,
        deleteTransaction,
        officeProfile,
        updateOfficeProfile,
        DEFAULT_OFFICE_PROFILE,
        appeals,
        addAppeal,
        updateAppeal,
        agendaEvents,
        addAgendaEvent,
        updateAgendaEvent,
        deleteAgendaEvent,
        recordSessionDecision,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
