import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    FormLabel,
    FormGroup,
    FormControl
} from '@mui/material';
import { createTask } from '../services/TaskService';
import { createTaskSeries } from '../services/TaskSeriesService';
import useAppUser from '../hooks/useAppUser';
import dayjs from 'dayjs';

const TaskFormDialog = ({ open, onClose, onTaskCreated }) => {
    const { user, loading: authLoading } = useAppUser();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('09:00');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Recurrence fields
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState('daily');
    const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri by default

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    const handleDayToggle = (day) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate || !user) {
            if (!user) {
                alert('Erreur: utilisateur non connecté');
            }
            return;
        }

        setIsSubmitting(true);
        try {
            const [hours, minutes] = (dueTime || '09:00').split(':').map(Number);

            if (isRecurring) {
                // Create task series
                const seriesData = {
                    titleTemplate: title.trim(),
                    description: description.trim(),
                    frequency,
                    daysOfWeek: (frequency === 'weekly' || frequency === 'specific_days') ? selectedDays : (frequency === 'school_days' ? [1, 2, 3, 4, 5] : null),
                    dueHour: hours,
                    dueMinute: minutes,
                    startDate: dayjs(dueDate).toDate(),
                    createdByUid: user.uid,
                    assignedTo: user.uid
                };

                await createTaskSeries(seriesData);

                // Trigger generation
                const { checkAndGenerateRecurringTasks } = await import('../services/RecurrenceService');
                await checkAndGenerateRecurringTasks();
            } else {
                // Create single task
                const dueDateTimeString = `${dueDate}T${dueTime}`;
                const dueAtDate = dayjs(dueDateTimeString).toDate();

                await createTask({
                    title: title.trim(),
                    description: description.trim(),
                    dueAt: dueAtDate,
                    status: 'scheduled',
                    createdByUid: user.uid,
                    assignedTo: user.uid
                });
            }

            // Reset form
            setTitle('');
            setDescription('');
            setDueDate('');
            setDueTime('09:00');
            setIsRecurring(false);
            setFrequency('daily');
            setSelectedDays([1, 2, 3, 4, 5]);

            if (onTaskCreated) onTaskCreated();
            onClose();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Erreur lors de la création de la tâche');
        } finally {
            setIsSubmitting(false);
        }
    };

    const showDayPicker = isRecurring && (frequency === 'weekly' || frequency === 'specific_days');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    NOUVELLE TÂCHE
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {!user && !authLoading && (
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ color: 'error.main', fontWeight: 'bold', fontSize: 16 }}>
                                Erreur : utilisateur non connecté. Veuillez vous reconnecter pour créer une tâche.
                            </Box>
                        </Box>
                    )}
                    <Box display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Titre"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <TextField
                            label="Date"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Heure"
                            type="time"
                            value={dueTime}
                            onChange={(e) => setDueTime(e.target.value)}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />

                        {/* Recurrence Section */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                />
                            }
                            label="Rendre récurrente ?"
                        />

                        {isRecurring && (
                            <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'primary.main' }}>
                                <FormControl fullWidth>
                                    <FormLabel sx={{ mb: 1 }}>Fréquence</FormLabel>
                                    <Select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                        fullWidth
                                    >
                                        <MenuItem value="daily">Tous les jours</MenuItem>
                                        <MenuItem value="weekly">Hebdomadaire</MenuItem>
                                        <MenuItem value="monthly">Mensuel</MenuItem>
                                        <MenuItem value="specific_days">Jours spécifiques</MenuItem>
                                        <MenuItem value="school_days">Jours d'école (L-V)</MenuItem>
                                    </Select>
                                </FormControl>

                                {showDayPicker && (
                                    <Box sx={{ mt: 2 }}>
                                        <FormLabel>Jours</FormLabel>
                                        <FormGroup row>
                                            {dayNames.map((name, index) => (
                                                <FormControlLabel
                                                    key={index}
                                                    control={
                                                        <Checkbox
                                                            checked={selectedDays.includes(index)}
                                                            onChange={() => handleDayToggle(index)}
                                                        />
                                                    }
                                                    label={name}
                                                />
                                            ))}
                                        </FormGroup>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={onClose} disabled={isSubmitting || authLoading}>
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting || authLoading || !title.trim() || !dueDate || !user}
                    >
                        {isSubmitting ? 'Création...' : 'Créer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default TaskFormDialog;
