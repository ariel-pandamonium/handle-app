import { create } from 'zustand'
import { supabase } from './supabase'

// ============================================================
// Auth Store — handles login state
// ============================================================
export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    loading: false,
  }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))

// ============================================================
// Plates Store — top-level life areas
// ============================================================
export const usePlatesStore = create((set, get) => ({
  plates: [],
  loading: false,

  fetchPlates: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('plates')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!error) {
      set({ plates: data, loading: false })
    } else {
      console.error('Error fetching plates:', error)
      set({ loading: false })
    }
  },
}))

// ============================================================
// Projects Store — Architecture sub-chips
// ============================================================
export const useProjectsStore = create((set) => ({
  projects: [],
  loading: false,

  fetchProjects: async (plateId) => {
    set({ loading: true })
    const query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })

    if (plateId) {
      query.eq('plate_id', plateId)
    }

    const { data, error } = await query

    if (!error) {
      set({ projects: data, loading: false })
    } else {
      console.error('Error fetching projects:', error)
      set({ loading: false })
    }
  },
}))

// ============================================================
// Tasks Store
// ============================================================
export const useTasksStore = create((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (filters = {}) => {
    set({ loading: true })
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('is_complete', false)
      .order('created_at', { ascending: true })

    if (filters.plateId) query = query.eq('plate_id', filters.plateId)
    if (filters.projectId) query = query.eq('project_id', filters.projectId)

    const { data, error } = await query

    if (!error) {
      set({ tasks: data, loading: false })
    } else {
      console.error('Error fetching tasks:', error)
      set({ loading: false })
    }
  },

  fetchAllTasks: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_complete', false)

    if (!error) {
      set({ tasks: data, loading: false })
    } else {
      console.error('Error fetching tasks:', error)
      set({ loading: false })
    }
  },
}))

// ============================================================
// Drop Store — inbox items (The Drop / Unsorted)
// Hard cap: 12 pending items ("Hands Full")
// ============================================================
export const useDropStore = create((set, get) => ({
  items: [],
  loading: false,

  fetchDropItems: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('drop_items')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!error) {
      set({ items: data || [], loading: false })
    } else {
      console.error('Error fetching drop items:', error)
      set({ loading: false })
    }
  },

  // Add a new drop item (raw text capture)
  addDropItem: async (rawText) => {
    const items = get().items
    if (items.length >= 12) {
      return { error: 'hands_full' }
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'not_authenticated' }

    const { data, error } = await supabase
      .from('drop_items')
      .insert({ user_id: user.id, raw_text: rawText.trim() })
      .select()
      .single()

    if (!error && data) {
      set({ items: [...items, data] })
      return { success: true }
    }
    return { error: error?.message || 'Failed to save' }
  },

  // Dismiss a drop item (not a real task)
  dismissDropItem: async (itemId) => {
    const { error } = await supabase
      .from('drop_items')
      .update({ status: 'dismissed' })
      .eq('id', itemId)

    if (!error) {
      set({ items: get().items.filter(i => i.id !== itemId) })
    }
    return { error }
  },

  // Convert a drop item into a real task
  convertDropItem: async (itemId, taskData) => {
    // 1. Create the task
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'not_authenticated' }

    const { error: taskError } = await supabase.from('tasks').insert({
      user_id: user.id,
      plate_id: taskData.plate_id,
      project_id: taskData.project_id || null,
      title: taskData.title,
      urgency_tier: taskData.urgency_tier,
      task_type: taskData.task_type,
      due_date: taskData.due_date || null,
    })

    if (taskError) return { error: taskError.message }

    // 2. Mark the drop item as converted
    const { error: updateError } = await supabase
      .from('drop_items')
      .update({ status: 'converted' })
      .eq('id', itemId)

    if (!updateError) {
      set({ items: get().items.filter(i => i.id !== itemId) })
    }
    return { error: updateError }
  },
}))

// ============================================================
// Preferences Store — theme, etc.
// ============================================================
export const usePreferencesStore = create((set) => ({
  palette: 'ember',
  loading: false,

  fetchPreferences: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .single()

    if (!error && data) {
      set({ palette: data.palette, loading: false })
      // Apply palette to document
      document.documentElement.className = `palette-${data.palette}`
    } else {
      set({ loading: false })
    }
  },

  setPalette: async (palette) => {
    set({ palette })
    document.documentElement.className = `palette-${palette}`

    await supabase
      .from('user_preferences')
      .update({ palette, updated_at: new Date().toISOString() })
      .eq('user_id', (await supabase.auth.getUser()).data.user.id)
  },
}))
