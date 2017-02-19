class HostChannel < ApplicationCable::Channel
  def subscribed
    game_session = GameSession.find(params[:game_session])
    stream_for game_session
  end

  def receive(data)
    game_session = GameSession.find(params[:game_session])
    ActionCable.server.broadcast(game_session, data)
  end
end
