# router = APIRouter(prefix="/notifications")
# @router.get("")
# def fetch_notifications(
#     include_dismissed: bool = False,
#     db_session: Session = Depends(get_db_session),
#     user: User = Depends(current_user),
# ) -> NotificationList:
#     notifications = get_user_notifications(db_session, user, include_dismissed)
#     return NotificationList(notifications=[NotificationResponse.from_orm(n) for n in notifications])
