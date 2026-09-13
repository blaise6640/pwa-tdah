import React, { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { Typography, Box, Paper } from '@mui/material';
import { Button } from '@mui/material';
import { subscribeToAllTasks } from '../services/TaskService';
import TaskCard from '../components/TaskCard';
import useAppUser from '../hooks/useAppUser';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

export default function PlanningPage() {
    const [tasks, setTasks] = useState([]);
    const { role } = useAppUser();
    const isChild = (role || '').toLowerCase() === 'child';

    useEffect(() => {
        const unsubscribe = subscribeToAllTasks((updatedTasks) => {
            setTasks(updatedTasks);
        });
        return () => unsubscribe();
    }, []);

    // Group by date
    const tasksByDate = tasks.reduce((acc, task) => {
        const dateKey = dayjs(task.dueAt).format('YYYY-MM-DD');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(task);
        return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(tasksByDate).sort();

    return (
        <MainLayout>
            <Typography variant="h4" gutterBottom sx={{ color: 'secondary.main', textShadow: '2px 2px 0px #000', mb: 4 }}>
                PLANNING
            </Typography>

            {sortedDates.map(date => (
                <Box key={date} sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{
                        bgcolor: '#333',
                        p: 1,
                        borderLeft: '5px solid #d500f9',
                        mb: 2,
                        fontFamily: '"Press Start 2P"',
                        fontSize: '0.9rem'
                    }}>
                        {dayjs(date).format('dddd D MMMM')}
                    </Typography>

                    <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
                        {tasksByDate[date].map(task => (
                            <Box key={task.id}>
                                <TaskCard task={task} onDone={() => { }} isChild={isChild} />
                            </Box>
                        ))}
                    </Box>
                </Box>
            ))}

            {sortedDates.length === 0 && (
                <Typography>Aucune tâche planifiée.</Typography>
            )}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" color="primary" onClick={() => window.location.href = '/dashboard'}>
                    Retour au tableau de bord
                </Button>
            </Box>
        </MainLayout>
    );
}
