import React, { useState } from 'react';
import { Player } from '../types';
import { UserPlus, Edit3, Trash2, User } from 'lucide-react';

interface PlayerManagementProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  onNext: () => void;
}

export default function PlayerManagement({ players, onPlayersChange, onNext }: PlayerManagementProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    handicap: 0
  });

  const handleAddPlayer = () => {
    if (players.length >= 10) return;
    
    setEditingPlayer(null);
    setShowAddForm(true);
    setFormData({ name: '', displayName: '', handicap: 0 });
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowAddForm(true);
    setFormData({
      name: player.name,
      displayName: player.displayName,
      handicap: player.handicap
    });
  };

  const handleSavePlayer = () => {
    if (!formData.name.trim() || !formData.displayName.trim()) return;

    if (editingPlayer) {
      // Edit existing player
      const updatedPlayers = players.map(p =>
        p.id === editingPlayer.id
          ? { ...p, ...formData }
          : p
      );
      onPlayersChange(updatedPlayers);
    } else {
      // Add new player
      const newPlayer: Player = {
        id: Date.now().toString(),
        ...formData
      };
      onPlayersChange([...players, newPlayer]);
    }

    setEditingPlayer(null);
    setShowAddForm(false);
    setFormData({ name: '', displayName: '', handicap: 0 });
  };

  const handleCancel = () => {
    setEditingPlayer(null);
    setShowAddForm(false);
    setFormData({ name: '', displayName: '', handicap: 0 });
  };

  const handleDeletePlayer = (playerId: string) => {
    onPlayersChange(players.filter(p => p.id !== playerId));
  };

  const canProceed = players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Player Management
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Add 2-10 players to start your game
          </p>

          {/* Player List */}
          <div className="space-y-4 mb-8">
            {players.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{player.name}</h3>
                    <p className="text-sm text-gray-600">
                      {player.displayName} • Handicap: {player.handicap}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPlayer(player)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit Player Form */}
          {showAddForm && (
            <div className="bg-emerald-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingPlayer ? 'Edit Player' : 'Add New Player'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter display name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handicap
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="54"
                    value={formData.handicap}
                    onChange={(e) => setFormData({ ...formData, handicap: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleSavePlayer}
                    disabled={!formData.name.trim() || !formData.displayName.trim()}
                    className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {editingPlayer ? 'Update Player' : 'Add Player'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Player Button */}
          {!showAddForm && players.length < 10 && (
            <button
              onClick={handleAddPlayer}
              className="w-full border-2 border-dashed border-emerald-300 text-emerald-600 py-4 px-4 rounded-xl font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Player ({players.length}/10)</span>
            </button>
          )}

          {/* Continue Button */}
          <div className="mt-8 pt-6 border-t">
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="w-full bg-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Course Selection
            </button>
            {!canProceed && (
              <p className="text-sm text-gray-500 text-center mt-2">
                Add at least 2 players to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}