import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [team, setTeam] = useState([]);
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

  const refreshAll = useCallback(async () => {
    if (!user) {
      setCases([]);
      setClients([]);
      setSessions([]);
      setTeam([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([fetchCases(), fetchClients(), fetchSessions(), fetchTeam()]);
    setLoading(false);
  }, [user, fetchCases, fetchClients, fetchSessions, fetchTeam]);

  useEffect(() => {
    refreshAll();

    if (user) {
      // Periodically refresh scoped data
      const interval = setInterval(refreshAll, 10000);
      return () => clearInterval(interval);
    }
  }, [user, refreshAll]);

  // Case Actions (Scoped by user_id)
  const addCase = async (newCase) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const caseData = { ...newCase, user_id: user.id };
    const { data, error } = await supabase.from('cases').insert([caseData]).select();
    if (error) throw error;
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

  // Client Actions (Scoped by user_id)
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

  // Session Actions (Scoped by user_id)
  const addSession = async (sessionData, caseUpdates) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    const sessionWithUser = { ...sessionData, user_id: user.id };
    const { data, error } = await supabase.from('sessions').insert([sessionWithUser]).select();
    if (error) throw error;

    if (caseUpdates && sessionData.case_id) {
      await supabase
        .from('cases')
        .update(caseUpdates)
        .eq('id', sessionData.case_id)
        .eq('user_id', user.id);
    }
    await refreshAll();
    return data;
  };

  // Team Actions (Scoped by user_id)
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

  return (
    <DataContext.Provider
      value={{
        cases,
        clients,
        sessions,
        team,
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
