import React, { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { Typography, Box, LinearProgress, Paper, Fab } from '@mui/material';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { subscribeToAllTasks, markTaskDone } from '../services/TaskService';
import TaskCard from '../components/TaskCard';
import TaskFormDialog from '../components/TaskFormDialog';
import useAppUser from '../hooks/useAppUser';
import { useUser } from '../contexts/UserContext';
import dayjs from 'dayjs';
import { checkAndGenerateRecurringTasks } from '../services/RecurrenceService';

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { role } = useAppUser();
    const { hasRegisteredToken } = useUser();
    const isChild = (role || '').toLowerCase() === 'child';

    useEffect(() => {
        // Generate tasks on load (naive implementation)
        checkAndGenerateRecurringTasks();

        const unsubscribe = subscribeToAllTasks((updatedTasks) => {
            setTasks(updatedTasks);
        });
        return () => unsubscribe();
    }, []);

    const handleTaskDone = async (taskId) => {
        await markTaskDone(taskId);
    };

    const overdueTasks = tasks.filter(t => t.status !== 'done' && dayjs(t.dueAt).isBefore(dayjs()));
    const todayTasks = tasks.filter(t => t.status !== 'done' && !dayjs(t.dueAt).isBefore(dayjs()) && dayjs(t.dueAt).isSame(dayjs(), 'day'));
    const doneToday = tasks.filter(t => t.status === 'done' && dayjs(t.updatedAt?.toDate()).isSame(dayjs(), 'day'));

    // XP Calculation (simple)
    const xp = doneToday.length * 10;
    const targetXp = 100;
    const progress = Math.min((xp / targetXp) * 100, 100);

    return (
        <MainLayout>
            <Box sx={{ mb: 4 }}>
                <Box display="grid" gap={2} alignItems="center" sx={{ gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
                    <Box>
                        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', textShadow: '2px 2px 0px #000' }}>
                            TABLEAU DE BORD
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: hasRegisteredToken ? 'success.main' : 'text.secondary' }}>
                            {hasRegisteredToken ? "FCM : Enregistré" : "FCM : Non enregistré"}
                        </Typography>
                    </Box>
                    <Box>
                        <Paper sx={{ p: 2, bgcolor: '#222' }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="h6" color="primary">XP: {xp} / {targetXp}</Typography>
                                <Typography variant="h6">LVL {Math.floor(xp / 100) + 1}</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={progress} color="primary" sx={{ height: 10, borderRadius: 0 }} />
                            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button variant="outlined" color="inherit" size="small" onClick={() => window.location.href = '/planning'}>
                                    Voir le planning
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            </Box>

            {overdueTasks.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" color="error" gutterBottom sx={{ textDecoration: 'underline' }}>
                        ⚠ EN RETARD ({overdueTasks.length})
                    </Typography>
                    {overdueTasks.map(task => (
                        <TaskCard key={task.id} task={task} onDone={handleTaskDone} isChild={isChild} />
                    ))}
                </Box>
            )}

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" color="text.primary" gutterBottom>
                    À FAIRE AUJOURD'HUI
                </Typography>
                {todayTasks.length === 0 && (
                    <Typography color="text.secondary">Rien à faire... pour l'instant !</Typography>
                )}
                {todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} onDone={handleTaskDone} isChild={isChild} />
                ))}
            </Box>

            <Box sx={{ mb: 4, opacity: 0.7 }}>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                    TERMINÉ
                </Typography>
                {doneToday.map(task => (
                    <TaskCard key={task.id} task={task} onDone={handleTaskDone} isChild={isChild} />
                ))}
            </Box>

            {/* Floating Action Button */}
            <Fab
                color="primary"
                aria-label="add"
                onClick={() => setDialogOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: { xs: 16, sm: 24 },
                    right: { xs: 16, sm: 24 },
                    width: { xs: 56, sm: 64 },
                    height: { xs: 56, sm: 64 },
                    zIndex: (theme) => theme.zIndex.modal + 1
                }}
            >
                <AddIcon sx={{ fontSize: 32 }} />
            </Fab>

            {/* Task Creation Dialog */}
            <TaskFormDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onTaskCreated={() => {
                    // Task will be automatically added via subscribeToAllTasks
                }}
            />
        </MainLayout>
    );
}
