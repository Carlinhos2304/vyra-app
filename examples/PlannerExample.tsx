// Example usage in the Planner Screen
import * as NotificationsService from '../services/notificationService';

const handleAddOutfit = async (outfit: { id: string, scheduledFor: Date }) => {
    // Logic to save to DB...
    
    // Schedule reminder
    await NotificationsService.schedulePlannedOutfitReminder(outfit.id, outfit.scheduledFor);
};

const handleDeleteOutfit = async (outfitId: string) => {
    // Logic to delete from DB...
    
    // Remove reminder
    await NotificationsService.cancelNotification(outfitId);
};

const handleEditOutfit = async (outfit: { id: string, scheduledFor: Date }) => {
    // Logic to update DB...
    
    // Re-schedule
    await NotificationsService.cancelNotification(outfit.id);
    await NotificationsService.schedulePlannedOutfitReminder(outfit.id, outfit.scheduledFor);
};
