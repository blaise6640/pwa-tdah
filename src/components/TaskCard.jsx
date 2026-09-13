import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import dayjs from 'dayjs';
import { deleteTask } from '../services/TaskService';
import useAppUser from '../hooks/useAppUser';

const TaskCard = ({ task, onDone, isChild }) => {
    const { user } = useAppUser();
    const isOverdue = task.status === 'scheduled' && dayjs(task.dueAt).isBefore(dayjs());
    const isDone = task.status === 'done';
    const canDelete = !isChild || task.createdByUid === user?.uid;

    const handleDelete = async () => {
        if (!confirm('Supprimer cette tâche ?')) return;
        try {
            await deleteTask(task.id);
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Erreur lors de la suppression');
        }
    };

    return (
        <Card
            sx={{
                mb: 2,
                bgcolor: isOverdue ? '#421c1c' : (isDone ? '#1c301c' : 'background.paper'),
                borderColor: isOverdue ? 'error.main' : (isDone ? 'success.main' : 'divider'),
                position: 'relative',
                overflow: 'visible'
            }}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                    <Box flex={1} sx={{ pr: { sm: 2 } }}>
                        <Typography variant="h6" color={isDone ? 'text.secondary' : 'text.primary'} sx={{ textDecoration: isDone ? 'line-through' : 'none', mb: 1 }}>
                            {task.title}
                        </Typography>
                        {task.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Roboto', mb: 2 }}>
                                {task.description}
                            </Typography>
                        )}

                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                                icon={<AccessTimeIcon />}
                                label={dayjs(task.dueAt).format('HH:mm - DD/MM')}
                                size="small"
                                color={isOverdue ? 'error' : 'default'}
                                variant="outlined"
                                sx={{ borderRadius: 0, fontFamily: 'Roboto' }}
                            />
                            {isOverdue && (
                                <Chip label="EN RETARD" color="error" size="small" sx={{ borderRadius: 0 }} />
                            )}
                        </Box>
                    </Box>

                    <Box display="flex" gap={1} alignItems="flex-start" sx={{ mt: { xs: 2, sm: 0 }, flexDirection: { xs: 'row', sm: 'column' }, alignItems: { xs: 'center', sm: 'flex-start' } }}>
                        {canDelete && (
                            <IconButton
                                onClick={handleDelete}
                                color="error"
                                size="small"
                                sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}

                        {!isDone && (
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => onDone(task.id)}
                                sx={{ minWidth: { xs: 88, sm: 120 }, width: { xs: 'auto', sm: 'auto' } }}
                            >
                                Terminé
                            </Button>
                        )}

                        {isDone && (
                            <Box sx={{ transform: 'rotate(-10deg)', border: '2px solid #00e676', p: 0.5, color: '#00e676' }}>
                                <Typography variant="h6">COMPLET</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default TaskCard;
